'use strict';

const PDFDocument = require('pdfkit');

/**
 * PDF generation utilities using PDFKit.
 */

// ── Brand colours ────────────────────────────────────────────────────────────
const BRAND_PRIMARY = '#6366F1';  // Indigo
const BRAND_DARK    = '#1E1B4B';
const GREY_LIGHT    = '#F3F4F6';
const GREY_TEXT     = '#6B7280';
const BLACK         = '#111827';

/**
 * Write a horizontal rule across the full page width.
 */
function hr(doc, y) {
  doc
    .strokeColor('#E5E7EB')
    .lineWidth(0.5)
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .stroke();
}

/**
 * Render a two-column key/value row.
 */
function kvRow(doc, label, value, y) {
  doc.fontSize(9).fillColor(GREY_TEXT).text(label, 50, y, { width: 160 });
  doc.fontSize(9).fillColor(BLACK).text(String(value || '—'), 220, y, {
    width: doc.page.width - 270,
  });
}

/**
 * Generate an event report PDF.
 *
 * @param {object} event  - Event record from the database
 * @param {object[]} tasks - Array of EventTask records
 * @returns {Promise<Buffer>} PDF file as a Buffer
 */
function generateEventReport(event, tasks = []) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Event Report — ${event.name}`,
        Author: 'Prani Platform',
        Subject: 'Event Report',
        CreationDate: new Date(),
      },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100; // content width (margins excluded)

    // ── Header band ──────────────────────────────────────────────────────────
    doc
      .rect(0, 0, doc.page.width, 90)
      .fill(BRAND_DARK);

    doc
      .fontSize(22)
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .text('EVENT REPORT', 50, 28);

    doc
      .fontSize(10)
      .fillColor('#A5B4FC')
      .font('Helvetica')
      .text('Prani — Intelligent Event Planning', 50, 58);

    // Report generation timestamp (top-right)
    doc
      .fontSize(8)
      .fillColor('#C7D2FE')
      .text(
        `Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`,
        doc.page.width - 200,
        58,
        { width: 150, align: 'right' }
      );

    doc.moveDown(3);

    // ── Event Overview section ────────────────────────────────────────────────
    let y = 110;

    doc
      .fontSize(12)
      .fillColor(BRAND_PRIMARY)
      .font('Helvetica-Bold')
      .text('Event Overview', 50, y);

    y += 20;
    hr(doc, y);
    y += 10;

    const overviewFields = [
      ['Event Name', event.name],
      ['Status', event.status ? event.status.toUpperCase() : 'PLANNING'],
      ['Event Date', event.eventDate ? new Date(event.eventDate).toDateString() : null],
      ['Venue', event.venue],
      ['Client', event.clientName],
      ['Guest Count', event.guestCount],
      ['Event Type', event.eventTypeSlug],
    ];

    for (const [label, value] of overviewFields) {
      kvRow(doc, label, value, y);
      y += 18;
    }

    y += 8;
    hr(doc, y);
    y += 14;

    // ── Budget section ────────────────────────────────────────────────────────
    doc
      .fontSize(12)
      .fillColor(BRAND_PRIMARY)
      .font('Helvetica-Bold')
      .text('Budget', 50, y);

    y += 20;
    hr(doc, y);
    y += 10;

    kvRow(doc, 'Total Budget', event.budget ? `RWF ${Number(event.budget).toLocaleString()}` : null, y);
    y += 18;

    const breakdown = event.budgetBreakdown;
    if (breakdown && typeof breakdown === 'object') {
      const entries = Array.isArray(breakdown) ? breakdown : Object.entries(breakdown).map(([k, v]) => ({ category: k, amount: v }));
      for (const entry of entries) {
        const category = entry.category || entry.name || 'Item';
        const amount = entry.amount || entry.estimated_cost || entry.actualCost || 0;
        kvRow(doc, `  ${category}`, `RWF ${Number(amount).toLocaleString()}`, y);
        y += 16;
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = 50;
        }
      }
    }

    y += 8;
    hr(doc, y);
    y += 14;

    // ── Notes ────────────────────────────────────────────────────────────────
    if (event.notes) {
      doc
        .fontSize(12)
        .fillColor(BRAND_PRIMARY)
        .font('Helvetica-Bold')
        .text('Notes', 50, y);

      y += 20;
      hr(doc, y);
      y += 10;

      doc
        .fontSize(9)
        .fillColor(BLACK)
        .font('Helvetica')
        .text(event.notes, 50, y, { width: pageWidth, lineGap: 3 });

      y = doc.y + 14;
      hr(doc, y);
      y += 14;
    }

    // ── Tasks section ────────────────────────────────────────────────────────
    if (tasks.length > 0) {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 50;
      }

      doc
        .fontSize(12)
        .fillColor(BRAND_PRIMARY)
        .font('Helvetica-Bold')
        .text('Tasks', 50, y);

      y += 20;
      hr(doc, y);
      y += 10;

      // Column headers
      doc
        .fontSize(8)
        .fillColor(GREY_TEXT)
        .font('Helvetica-Bold')
        .text('#', 50, y, { width: 20 })
        .text('Title', 75, y, { width: 190 })
        .text('Status', 270, y, { width: 70 })
        .text('Priority', 345, y, { width: 60 })
        .text('Due Date', 410, y, { width: 100 });

      y += 14;
      hr(doc, y);
      y += 6;

      const statusColors = {
        done: '#10B981',
        completed: '#10B981',
        'in-progress': '#F59E0B',
        'in_progress': '#F59E0B',
        todo: GREY_TEXT,
        blocked: '#EF4444',
      };

      tasks.forEach((task, idx) => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 50;
        }

        const rowBg = idx % 2 === 0 ? '#FFFFFF' : GREY_LIGHT;
        doc.rect(50, y - 2, pageWidth, 16).fill(rowBg);

        const statusColor = statusColors[(task.status || '').toLowerCase()] || BLACK;
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

        doc
          .fontSize(8)
          .fillColor(BLACK)
          .font('Helvetica')
          .text(String(idx + 1), 50, y, { width: 20 })
          .text(task.title || '—', 75, y, { width: 190 });

        doc
          .fillColor(statusColor)
          .text((task.status || 'todo').toUpperCase(), 270, y, { width: 70 });

        doc
          .fillColor(task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : GREY_TEXT)
          .text((task.priority || 'medium').toUpperCase(), 345, y, { width: 60 });

        doc
          .fillColor(BLACK)
          .text(dueDate, 410, y, { width: 100 });

        y += 18;
      });

      const done = tasks.filter((t) => ['done', 'completed'].includes((t.status || '').toLowerCase())).length;
      y += 8;
      hr(doc, y);
      y += 10;

      doc
        .fontSize(9)
        .fillColor(GREY_TEXT)
        .font('Helvetica')
        .text(
          `${done} of ${tasks.length} tasks completed  (${tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0}%)`,
          50,
          y
        );
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 35;
    doc
      .fontSize(7)
      .fillColor(GREY_TEXT)
      .font('Helvetica')
      .text(
        'Prani — AI-Powered Event Planning Platform  |  Confidential',
        50,
        footerY,
        { width: pageWidth, align: 'center' }
      );

    doc.end();
  });
}

module.exports = { generateEventReport };
