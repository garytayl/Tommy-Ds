"use client";

import { useMemo, useRef, useState } from "react";

import { wholeDollarsToCents } from "@/lib/money";
import { loadStripeTerminal } from "@stripe/terminal-js";

type Props = {
  className?: string;
  title?: string;
  descriptionDefault?: string;
  amountDefaultDollars?: number | null;
  invoiceId?: string | null;
  jobId?: string | null;
  customerId?: string | null;
};

type TerminalIntentResponse = {
  payment_intent_id: string;
  client_secret: string;
  isolated_payment_id: string;
};

function combineClassName(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

export function TerminalCollectPanel({
  className,
  title = "Terminal card-present checkout",
  descriptionDefault = "In-person payment",
  amountDefaultDollars = null,
  invoiceId = null,
  jobId = null,
  customerId = null,
}: Props) {
  const terminalRef = useRef<any | null>(null);
  const [description, setDescription] = useState(descriptionDefault);
  const [note, setNote] = useState("");
  const [amountDigits, setAmountDigits] = useState(
    amountDefaultDollars != null && amountDefaultDollars > 0
      ? String(Math.round(amountDefaultDollars))
      : "",
  );
  const [simulateReader, setSimulateReader] = useState(
    process.env.NODE_ENV !== "production",
  );
  const [readerLabel, setReaderLabel] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<string>(
    "Connect a Stripe Terminal reader to start card-present checkout.",
  );
  const [error, setError] = useState<string | null>(null);

  const amountCents = useMemo(
    () => wholeDollarsToCents(amountDigits),
    [amountDigits],
  );

  async function ensureTerminal() {
    if (terminalRef.current) return terminalRef.current;
    const stripeTerminal = await loadStripeTerminal();
    if (!stripeTerminal) {
      throw new Error("Unable to load Stripe Terminal SDK");
    }
    const terminal = stripeTerminal.create({
      onFetchConnectionToken: async () => {
        const response = await fetch("/api/stripe/terminal/connection-token", {
          method: "POST",
        });
        const data = (await response.json()) as { secret?: string; error?: string };
        if (!response.ok || !data.secret) {
          throw new Error(data.error ?? "Failed to fetch terminal connection token");
        }
        return data.secret;
      },
      onUnexpectedReaderDisconnect: () => {
        setReaderLabel(null);
        setStatus("Reader disconnected unexpectedly. Reconnect to continue.");
      },
    });
    terminalRef.current = terminal;
    return terminal;
  }

  async function connectReader() {
    setWorking(true);
    setError(null);
    try {
      setStatus("Loading terminal SDK...");
      const terminal = await ensureTerminal();

      setStatus("Discovering readers...");
      const discovery = await terminal.discoverReaders({
        simulated: simulateReader,
      });
      if (discovery.error) {
        throw new Error(discovery.error.message);
      }
      if (!discovery.discoveredReaders.length) {
        throw new Error(
          simulateReader
            ? "No simulated readers found. Try again in a moment."
            : "No readers found nearby. Turn on your reader and retry.",
        );
      }

      const reader = discovery.discoveredReaders[0];
      const connection = await terminal.connectReader(reader);
      if (connection.error) {
        throw new Error(connection.error.message);
      }
      const connectedName =
        connection.reader?.label ||
        connection.reader?.serial_number ||
        "Connected reader";
      setReaderLabel(connectedName);
      setStatus(`Connected to ${connectedName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect reader");
    } finally {
      setWorking(false);
    }
  }

  async function cancelPaymentIntent(paymentIntentId: string) {
    await fetch("/api/stripe/terminal/cancel-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    }).catch(() => undefined);
  }

  async function startTerminalCheckout() {
    if (!readerLabel) {
      setError("Connect a reader first.");
      return;
    }
    if (!description.trim()) {
      setError("Add a description.");
      return;
    }
    if (amountCents <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setWorking(true);
    setError(null);
    let createdPaymentIntentId: string | null = null;
    try {
      const terminal = await ensureTerminal();
      setStatus("Creating terminal payment intent...");
      const intentResponse = await fetch(
        "/api/stripe/terminal/create-payment-intent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_cents: amountCents,
            description: description.trim(),
            note: note.trim() || null,
            invoice_id: invoiceId,
            job_id: jobId,
            customer_id: customerId,
          }),
        },
      );
      const intentData = (await intentResponse.json()) as
        | TerminalIntentResponse
        | { error?: string };
      if (!intentResponse.ok || !("client_secret" in intentData)) {
        throw new Error(
          "error" in intentData && intentData.error
            ? intentData.error
            : "Unable to create terminal payment intent",
        );
      }
      createdPaymentIntentId = intentData.payment_intent_id;

      setStatus("Collecting card payment...");
      const collectResult = await terminal.collectPaymentMethod(
        intentData.client_secret,
      );
      if (collectResult.error) {
        await cancelPaymentIntent(createdPaymentIntentId);
        throw new Error(collectResult.error.message);
      }

      setStatus("Processing payment...");
      const processResult = await terminal.processPayment(
        collectResult.paymentIntent,
      );
      if (processResult.error) {
        await cancelPaymentIntent(createdPaymentIntentId);
        throw new Error(processResult.error.message);
      }

      setStatus("Payment approved. Refreshing billing list...");
      window.setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete terminal payment",
      );
      setStatus("Terminal payment failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section
      className={combineClassName(
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Uses Stripe Terminal card-present checkout with a connected reader.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
          className="field min-h-11 sm:col-span-2"
        />
        <input
          type="text"
          value={amountDigits}
          onChange={(event) =>
            setAmountDigits(event.target.value.replace(/[^0-9]/g, ""))
          }
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Amount (whole dollars)"
          className="field min-h-11"
        />
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
          className="field min-h-11"
        />
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={simulateReader}
          onChange={(event) => setSimulateReader(event.target.checked)}
        />
        Use simulated reader (dev/testing)
      </label>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="btn-secondary min-h-11"
          onClick={connectReader}
          disabled={working}
        >
          {readerLabel ? "Reconnect reader" : "Connect reader"}
        </button>
        <button
          type="button"
          className="btn-primary min-h-11"
          onClick={startTerminalCheckout}
          disabled={working || !readerLabel}
        >
          Charge with terminal
        </button>
      </div>

      {readerLabel ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Reader: <span className="font-medium text-foreground">{readerLabel}</span>
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">{status}</p>
      {error ? (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </section>
  );
}
