import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { loadInvoice, type InvoiceData } from "@/lib/invoice-data";

/**
 * The invoice as a real PDF file.
 *
 * Drawn with pdf-lib rather than rendered from HTML: no headless browser to
 * install in the container, and the output is identical every time.
 *
 * Standard PDF fonts are WinAnsi-encoded, so the taka sign cannot be drawn —
 * amounts read "BDT 97,000" instead of "৳97,000".
 */

const INK = rgb(0.106, 0.145, 0.278);
const MUTED = rgb(0.46, 0.5, 0.67);
const LINE = rgb(0.898, 0.91, 0.949);
const BRAND = rgb(0.255, 0.294, 0.588);
const CORAL = rgb(0.914, 0.294, 0.31);

function money(amount: number, currency: string) {
  const value = amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${currency} ${value}`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Breaks text to fit a column, since pdf-lib will happily overflow. */
function wrap(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function buildPdf(invoice: InvoiceData) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const left = 56;
  const right = 595.28 - 56;
  let y = 780;

  const text = (
    value: string,
    x: number,
    size: number,
    font = regular,
    color = INK,
  ) => page.drawText(value, { x, y, size, font, color });

  const rightText = (
    value: string,
    size: number,
    font = regular,
    color = INK,
  ) =>
    page.drawText(value, {
      x: right - font.widthOfTextAtSize(value, size),
      y,
      size,
      font,
      color,
    });

  const rule = () => {
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 1,
      color: LINE,
    });
  };

  // ---- header --------------------------------------------------------
  page.drawRectangle({ x: left, y: y - 6, width: 30, height: 30, color: BRAND });
  page.drawText("H", { x: left + 9, y: y + 3, size: 15, font: bold, color: rgb(1, 1, 1) });

  text("HANGEUL", left + 40, 15, bold);
  y -= 13;
  text("GLOBAL LEARNING CENTER", left + 40, 7.5, regular, MUTED);
  y += 13;

  rightText(invoice.paid ? "INVOICE" : "PAYMENT RECORD", 9, bold, MUTED);
  y -= 20;
  rightText(invoice.invoiceNo, 17, bold);

  if (!invoice.paid) {
    y -= 15;
    rightText(invoice.status.replace(/_/g, " ").toUpperCase(), 9, bold, CORAL);
  }

  y -= 28;
  rule();
  y -= 26;

  // ---- parties -------------------------------------------------------
  const columnWidth = (right - left) / 2 - 12;
  const topOfParties = y;

  text("FROM", left, 8, bold, MUTED);
  y -= 15;
  text(invoice.centre.name, left, 11, bold);

  for (const line of wrap(invoice.centre.address, regular, 9.5, columnWidth)) {
    y -= 13;
    text(line, left, 9.5, regular, MUTED);
  }
  y -= 13;
  text(invoice.centre.phone, left, 9.5, regular, MUTED);
  y -= 13;
  text(invoice.centre.email, left, 9.5, regular, MUTED);

  const bottomOfFrom = y;
  y = topOfParties;
  const rightColumn = left + columnWidth + 24;

  text("BILLED TO", rightColumn, 8, bold, MUTED);
  y -= 15;
  text(invoice.student.name, rightColumn, 11, bold);
  if (invoice.student.email) {
    y -= 13;
    text(invoice.student.email, rightColumn, 9.5, regular, MUTED);
  }
  if (invoice.student.phone) {
    y -= 13;
    text(invoice.student.phone, rightColumn, 9.5, regular, MUTED);
  }

  y = Math.min(bottomOfFrom, y) - 26;
  rule();
  y -= 22;

  // ---- line item -----------------------------------------------------
  text("DESCRIPTION", left, 8, bold, MUTED);
  rightText("AMOUNT", 8, bold, MUTED);
  y -= 20;

  text(invoice.course.title, left, 11, bold);
  rightText(money(invoice.amount, invoice.currency), 11, bold);

  if (invoice.course.level) {
    y -= 14;
    text(invoice.course.level, left, 9, regular, MUTED);
  }
  if (invoice.batch) {
    y -= 13;
    const detail = invoice.batch.schedule
      ? `${invoice.batch.name} · ${invoice.batch.schedule}`
      : invoice.batch.name;
    for (const line of wrap(detail, regular, 9, right - left - 120)) {
      text(line, left, 9, regular, MUTED);
      y -= 12;
    }
    y += 12;
  }

  y -= 22;
  rule();
  y -= 24;

  text(invoice.paid ? "Total paid" : "Total", left, 12, bold);
  rightText(money(invoice.amount, invoice.currency), 18, bold);

  y -= 30;
  rule();
  y -= 20;

  // ---- payment details ------------------------------------------------
  const detail = (label: string, value: string) => {
    text(label, left, 9, regular, MUTED);
    text(value, left + 110, 9, bold);
    y -= 16;
  };

  detail("Method", invoice.method);
  if (invoice.reference) detail("Reference", invoice.reference);
  detail(invoice.paid ? "Confirmed on" : "Submitted on", formatDate(invoice.issuedAt));

  // ---- footer ---------------------------------------------------------
  page.drawText(
    `This invoice was generated by ${invoice.centre.name}. Keep it for your records.`,
    { x: left, y: 60, size: 8, font: regular, color: MUTED },
  );

  return pdf.save();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=/invoice/${paymentId}`, request.nextUrl.origin),
    );
  }

  const invoice = await loadInvoice(paymentId, user.id);
  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const bytes = await buildPdf(invoice);
  const filename = `${invoice.invoiceNo.replace(/[^A-Za-z0-9-]/g, "") || "invoice"}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
