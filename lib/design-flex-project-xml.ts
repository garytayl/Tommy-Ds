import { centsToDollars } from "@/lib/money";

import type { QuoteExportPayload } from "@/lib/quote-export-xml";

const PLACEHOLDER_SEND = "000000000";

function cdata(text: string): string {
  return `<![CDATA[${text.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function escEl(text: string | null | undefined): string {
  if (text == null || text === "") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoneyRaw(dollars: number): string {
  return dollars.toFixed(2);
}

/** 9-digit SendSize field (Design Flex convention). */
export function padSendSize(byteLength: number): string {
  const n = Math.min(999_999_999, Math.max(0, Math.floor(byteLength)));
  return String(n).padStart(9, "0");
}

function priceRow(
  kind: "Price" | "PriceQuantity",
  type: "Cost" | "List" | "Retail",
  level: 1 | 2 | 3 | 4,
  dollars: number,
): string {
  const v = fmtMoneyRaw(dollars);
  const fv = `$${v.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  return [
    `        <${kind} Type="${type}" Mode="Fixed" Level="${level}">`,
    `          <Value>${v}</Value>`,
    `          <FormattedValue>${cdata(fv)}</FormattedValue>`,
    `        </${kind}>`,
  ].join("\n");
}

/** Per Design Flex samples: Price uses unit (Cost 0, List/Retail same); PriceQuantity uses extended. */
function priceLadderUnitAndExtended(unitDollars: number, extendedDollars: number): string {
  const z = 0;
  const out: string[] = [];
  for (const level of [1, 2, 3, 4] as const) {
    const u = level === 1 ? unitDollars : z;
    out.push(priceRow("Price", "Cost", level, level === 1 ? z : z));
    out.push(priceRow("Price", "List", level, u));
    out.push(priceRow("Price", "Retail", level, u));
  }
  for (const level of [1, 2, 3, 4] as const) {
    const e = level === 1 ? extendedDollars : z;
    out.push(priceRow("PriceQuantity", "Cost", level, level === 1 ? z : z));
    out.push(priceRow("PriceQuantity", "List", level, e));
    out.push(priceRow("PriceQuantity", "Retail", level, e));
  }
  return out.join("\n");
}

function codeFromDescription(desc: string, index: number): string {
  const alnum = desc.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 12);
  return alnum || `LINE${index + 1}`;
}

/**
 * Design Flex / Compusoft-style Project XML (Project.xsd) for Ponderosa and similar importers.
 * Line items are mapped to simplified Item nodes; catalog metadata is generic because we are not a .kit design file.
 */
export function buildDesignFlexProjectXml(payload: QuoteExportPayload): string {
  const catalogRef = "TOMMYDS_1";
  const docTitle = payload.title.trim() || "Quote";
  const safePath = `${docTitle.replace(/[<>:"/\\|?*]/g, "_")}.xml`;
  const custName = payload.customer?.name?.trim() ?? "";
  const jobAddr = [payload.address_line1, payload.city, payload.state, payload.zip].filter(Boolean).join(", ");

  const itemsXml = payload.items.map((line, i) => {
    const n = i + 1;
    const itemId = `IDI-1-${1000 + n}`;
    const userCode = codeFromDescription(line.description, i);
    const qty = Number.isFinite(line.qty) ? line.qty : 1;
    const unit = centsToDollars(line.unit_price_cents);
    const ext = centsToDollars(line.line_total_cents);
    const sortNum = String(n).padStart(5, "0");

    return [
      `      <Item ID="${itemId}">`,
      `        <CheckSum>0</CheckSum>`,
      `        <IsValid>1</IsValid>`,
      `        <UserCode>${escEl(userCode)}</UserCode>`,
      `        <LinkCode>TDS-${escEl(payload.id.replace(/-/g, "").slice(0, 8))}</LinkCode>`,
      `        <ManufCode>${escEl(userCode)}</ManufCode>`,
      `        <Description>${cdata(line.description)}</Description>`,
      `        <Class>885</Class>`,
      `        <Instance>Charge</Instance>`,
      `        <ItemTypeName>Special Items</ItemTypeName>`,
      `        <ItemType>4</ItemType>`,
      `        <SubTypeName>Undefined</SubTypeName>`,
      `        <SubType>8</SubType>`,
      `        <ChargeType>0</ChargeType>`,
      `        <EOType>-1</EOType>`,
      `        <IsCorner>0</IsCorner>`,
      `        <IsPlaced>0</IsPlaced>`,
      `        <IsCustom>0</IsCustom>`,
      `        <IsWallMounted>0</IsWallMounted>`,
      `        <IsFloorstanding>1</IsFloorstanding>`,
      `        <Finish>Both</Finish>`,
      `        <Hinge>None</Hinge>`,
      `        <Quantity>${qty}</Quantity>`,
      `        <IsForeign>0</IsForeign>`,
      `        <HasForeign>0</HasForeign>`,
      `        <NbDoor>0</NbDoor>`,
      `        <NbDrawer>0</NbDrawer>`,
      `        <NbPull>0</NbPull>`,
      `        <NbDrawerPull>0</NbDrawerPull>`,
      `        <NbShelf>0</NbShelf>`,
      `        <NbGlide>`,
      `        </NbGlide>`,
      priceLadderUnitAndExtended(unit, ext),
      `        <ZoneID>-1</ZoneID>`,
      `        <AbsolutePos x="0" y="0" z="0">`,
      `        </AbsolutePos>`,
      `        <Direction>0</Direction>`,
      `        <FeatureSetRef>IDFS-1</FeatureSetRef>`,
      `        <LineItemNumber>${n}</LineItemNumber>`,
      `        <SortLineItemNumber>${sortNum}</SortLineItemNumber>`,
      `      </Item>`,
    ].join("\n");
  });

  const subtotal = centsToDollars(payload.subtotal_cents);
  const tax = centsToDollars(payload.tax_cents);
  const total = centsToDollars(payload.total_cents);
  const beforeTaxRetail = subtotal;
  const netRetail = total;
  const taxPct = payload.subtotal_cents > 0 ? (100 * payload.tax_cents) / payload.subtotal_cents : 0;

  const catalogPricing = [
    `      <Pricing>`,
    `        <GroupTotal Group="Catalog">`,
    `          <Reference>${cdata(catalogRef)}</Reference>`,
    `          <Name />`,
    `          <Total>`,
    `            <BeforeTax>1</BeforeTax>`,
    `            <Net>0</Net>`,
    `            <Description>${cdata(`${catalogRef} total`)}</Description>`,
    `            <Price Type="Retail" Mode="Sum" Level="1">`,
    `              <Value>${fmtMoneyRaw(beforeTaxRetail)}</Value>`,
    `              <FormattedValue>${cdata(`$${beforeTaxRetail.toFixed(2)}`)}</FormattedValue>`,
    `            </Price>`,
    `            <Price Type="Retail" Mode="Sum" Level="2">`,
    `              <Value>0</Value>`,
    `              <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `            </Price>`,
    `            <Price Type="Retail" Mode="Sum" Level="3">`,
    `              <Value>0</Value>`,
    `              <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `            </Price>`,
    `            <Price Type="Retail" Mode="Sum" Level="4">`,
    `              <Value>0</Value>`,
    `              <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `            </Price>`,
    `          </Total>`,
    `          <Total>`,
    `            <BeforeTax>0</BeforeTax>`,
    `            <Net>1</Net>`,
    `            <Description>${cdata(`${catalogRef} net total`)}</Description>`,
    `            <Price Type="Retail" Mode="Sum" Level="1">`,
    `              <Value>${fmtMoneyRaw(netRetail)}</Value>`,
    `              <FormattedValue>${cdata(`$${netRetail.toFixed(2)}`)}</FormattedValue>`,
    `            </Price>`,
    `            <Price Type="Retail" Mode="Sum" Level="2">`,
    `              <Value>0</Value>`,
    `              <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `            </Price>`,
    `            <Price Type="Retail" Mode="Sum" Level="3">`,
    `              <Value>0</Value>`,
    `              <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `            </Price>`,
    `            <Price Type="Retail" Mode="Sum" Level="4">`,
    `              <Value>0</Value>`,
    `              <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `            </Price>`,
    `          </Total>`,
    `        </GroupTotal>`,
    `      </Pricing>`,
    `      <TotalWeight>0</TotalWeight>`,
    `      <TotalVolume>0</TotalVolume>`,
  ].join("\n");

  const designTaxBlock =
    payload.tax_cents > 0
      ? [
          `        <Tax Number="1">`,
          `          <Code>${cdata("TAX")}</Code>`,
          `          <Description>${cdata("Tax")}</Description>`,
          `          <ApplyTax2>1</ApplyTax2>`,
          `          <Price Type="Retail" Mode="Percent" Level="1">`,
          `            <Value>${fmtMoneyRaw(tax)}</Value>`,
          `            <FormattedValue>${cdata(`$${tax.toFixed(2)}`)}</FormattedValue>`,
          `            <Percent>${fmtMoneyRaw(taxPct)}</Percent>`,
          `          </Price>`,
          `          <Price Type="Retail" Mode="Percent" Level="2">`,
          `            <Value>0</Value>`,
          `            <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
          `            <Percent>${fmtMoneyRaw(taxPct)}</Percent>`,
          `          </Price>`,
          `          <Price Type="Retail" Mode="Percent" Level="3">`,
          `            <Value>0</Value>`,
          `            <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
          `            <Percent>${fmtMoneyRaw(taxPct)}</Percent>`,
          `          </Price>`,
          `          <Price Type="Retail" Mode="Percent" Level="4">`,
          `            <Value>0</Value>`,
          `            <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
          `            <Percent>${fmtMoneyRaw(taxPct)}</Percent>`,
          `          </Price>`,
          `        </Tax>`,
        ].join("\n")
      : "";

  const timeTrackerJson = JSON.stringify({
    export: "Tommy Ds",
    quoteId: payload.id,
    customer: custName || undefined,
    jobSite: jobAddr || undefined,
    notes: payload.notes?.trim() ? payload.notes.trim() : undefined,
  });

  const inner = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="Project.xsd" Name="Job">`,
    `  <Version>1</Version>`,
    `  <ContentID>1</ContentID>`,
    `  <Source>`,
    `    <Name>${cdata("Tommy Ds")}</Name>`,
    `    <BuildVersion>${cdata("Web quote export")}</BuildVersion>`,
    `    <ComputerName>${cdata("")}</ComputerName>`,
    `  </Source>`,
    `  <SendSize>${PLACEHOLDER_SEND}</SendSize>`,
    `  <Priority>N</Priority>`,
    `  <Design>`,
    `    <CheckSum>0</CheckSum>`,
    `    <Document>`,
    `      <DocType>quote</DocType>`,
    `      <FilePath>${cdata(safePath)}</FilePath>`,
    `      <FileName>${cdata(docTitle)}</FileName>`,
    `    </Document>`,
    `    <JobInfo>`,
    `      <FileName>${cdata(jobAddr || docTitle)}</FileName>`,
    `    </JobInfo>`,
    `    <Catalog>`,
    `      <Identification>`,
    `        <Name>${cdata(catalogRef)}</Name>`,
    `        <ShortName>TOMMYDS</ShortName>`,
    `        <Description>Tommy Ds exported quote</Description>`,
    `        <CurrencyName>USD</CurrencyName>`,
    `        <CreationDate>${cdata(new Date(payload.created_at).toISOString().slice(0, 19).replace("T", " "))}</CreationDate>`,
    `        <ModificationDate>${cdata(new Date().toISOString().slice(0, 19).replace("T", " "))}</ModificationDate>`,
    `        <CatVersion>1</CatVersion>`,
    `        <MeasurementUnit>Imperial</MeasurementUnit>`,
    `        <Profile Type="Manufacturer">`,
    `          <Code>`,
    `          </Code>`,
    `          <Name>Tommy Ds</Name>`,
    `          <Location Type="Main">`,
    `            <Address>`,
    `            </Address>`,
    `            <Address>`,
    `            </Address>`,
    `            <City>`,
    `            </City>`,
    `            <State>`,
    `            </State>`,
    `            <Country>`,
    `            </Country>`,
    `            <Zip>`,
    `            </Zip>`,
    `            <Note>`,
    `            </Note>`,
    `          </Location>`,
    `          <Contact Type="Main">`,
    `            <Phone>`,
    `              <Type>Office</Type>`,
    `              <Number>`,
    `              </Number>`,
    `            </Phone>`,
    `            <Phone>`,
    `              <Type>Fax</Type>`,
    `              <Number>`,
    `              </Number>`,
    `            </Phone>`,
    `          </Contact>`,
    `        </Profile>`,
    `        <CatalogHasStyle>0</CatalogHasStyle>`,
    `      </Identification>`,
    `      <FeatureSet ID="IDFS-1" Type="Style">`,
    `        <Code>${cdata("1")}</Code>`,
    `        <Description>${cdata("Quote line items")}</Description>`,
    `      </FeatureSet>`,
    itemsXml,
    catalogPricing,
    `    </Catalog>`,
    `    <Pricing>`,
    `      <CurrencyCode>USD</CurrencyCode>`,
    `      <GroupTotal Group="Design">`,
    designTaxBlock,
    `        <Total>`,
    `          <BeforeTax>1</BeforeTax>`,
    `          <Net>0</Net>`,
    `          <Description>${cdata("Design total")}</Description>`,
    `          <Price Type="Retail" Mode="Sum" Level="1">`,
    `            <Value>${fmtMoneyRaw(beforeTaxRetail)}</Value>`,
    `            <FormattedValue>${cdata(`$${beforeTaxRetail.toFixed(2)}`)}</FormattedValue>`,
    `          </Price>`,
    `          <Price Type="Retail" Mode="Sum" Level="2">`,
    `            <Value>0</Value>`,
    `            <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `          </Price>`,
    `          <Price Type="Retail" Mode="Sum" Level="3">`,
    `            <Value>0</Value>`,
    `            <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `          </Price>`,
    `          <Price Type="Retail" Mode="Sum" Level="4">`,
    `            <Value>0</Value>`,
    `            <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `          </Price>`,
    `        </Total>`,
    `        <Total>`,
    `          <BeforeTax>0</BeforeTax>`,
    `          <Net>1</Net>`,
    `          <Description>${cdata("Design net total")}</Description>`,
    `          <Price Type="Retail" Mode="Sum" Level="1">`,
    `            <Value>${fmtMoneyRaw(netRetail)}</Value>`,
    `            <FormattedValue>${cdata(`$${netRetail.toFixed(2)}`)}</FormattedValue>`,
    `          </Price>`,
    `          <Price Type="Retail" Mode="Sum" Level="2">`,
    `            <Value>0</Value>`,
    `            <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `          </Price>`,
    `          <Price Type="Retail" Mode="Sum" Level="3">`,
    `            <Value>0</Value>`,
    `            <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `          </Price>`,
    `          <Price Type="Retail" Mode="Sum" Level="4">`,
    `            <Value>0</Value>`,
    `            <FormattedValue>${cdata("$0.00")}</FormattedValue>`,
    `          </Price>`,
    `        </Total>`,
    `      </GroupTotal>`,
    `    </Pricing>`,
    `    <TotalWeight>0</TotalWeight>`,
    `    <TotalVolume>0</TotalVolume>`,
    `    <TimeTracker>${cdata(timeTrackerJson)}</TimeTracker>`,
    `  </Design>`,
    `</Project>`,
  ].join("\n");

  const sendSize = padSendSize(new TextEncoder().encode(inner).length);
  return inner.replace(PLACEHOLDER_SEND, sendSize);
}
