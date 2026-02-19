import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Waybill, CompanySettings, Site, Vehicle } from "@/types/asset";
import { logger } from "@/lib/logger";

interface PDFGenerationOptions {
  waybill: Waybill;
  companySettings?: CompanySettings;
  sites: Site[];
  vehicles?: Vehicle[];
  type: 'waybill' | 'return';
  signatureUrl?: string;
  signatureName?: string;
}

const defaultCompanySettings: CompanySettings = {
  companyName: "Dewatering Construction Etc Limited",
  logo: "/logo.png",
  address: "7 Musiliu Smith St, formerly Panti Street, Adekunle, Lagos 101212, Lagos",
  phone: "+2349030002182",
  email: "info@dewaterconstruct.com",
  website: "https://dewaterconstruct.com/",
  currency: "NGN",
  dateFormat: "MM/dd/yyyy",
  theme: "light",
  notifications: {
    email: true,
    push: true,
  },
};

// Helper to load image
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    // Convert relative paths to absolute URLs
    if (src.startsWith('/') && !src.startsWith('//')) {
      img.src = window.location.origin + src;
    } else {
      img.src = src;
    }
  });
};

export const generateProfessionalPDF = async ({ waybill, companySettings, sites, vehicles, type, signatureUrl, signatureName }: PDFGenerationOptions) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Margin: 0.5 inch = 12.7 mm on all sides
  const MARGIN = 12.7;
  const contentWidth = pageWidth - MARGIN * 2;

  pdf.setFont('times', 'normal');

  const site = sites.find(s => s.id === waybill.siteId);
  const fromLocation = 'DCEL Warehouse';
  const toLocation = site
    ? (site.clientName ? `${site.name} (${site.clientName})` : site.name)
    : 'Client Site';

  // Merge provided companySettings with defaults, only using non-empty values
  const effectiveCompanySettings: CompanySettings = {
    ...defaultCompanySettings,
    ...(companySettings ? Object.fromEntries(
      Object.entries(companySettings).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ) : {})
  };

  // Function to render header (logo, title, waybill no/date/driver/vehicle left-aligned)
  const renderHeader = async () => {
    let headerY = MARGIN;

    // Company Logo or placeholder circle (top-left, flush with left margin)
    const maxW = 85;
    const maxH = 30;
    const logoY = headerY;

    if (effectiveCompanySettings.logo) {
      try {
        const img = await loadImage(effectiveCompanySettings.logo);
        const aspect = img.width / img.height;

        let finalW = maxW;
        let finalH = maxW / aspect;

        if (finalH > maxH) {
          finalH = maxH;
          finalW = maxH * aspect;
        }

        // Determine format
        let format: string | undefined = undefined;
        if (effectiveCompanySettings.logo.startsWith('data:image/png')) format = 'PNG';
        else if (effectiveCompanySettings.logo.startsWith('data:image/jpeg')) format = 'JPEG';
        else if (effectiveCompanySettings.logo.startsWith('data:image/jpg')) format = 'JPEG';

        // Logo placed flush at left margin (MARGIN, not 20)
        pdf.addImage(effectiveCompanySettings.logo, format as any, MARGIN, logoY, finalW, finalH);
      } catch (error) {
        logger.warn('Could not load company logo', { context: 'ProfessionalPDFGenerator' });
        // Fallback circle
        pdf.setFillColor(200, 200, 200);
        pdf.circle(MARGIN + 15, logoY + 15, 15, 'F');
        pdf.setFontSize(9);
        pdf.setFont('times', 'bold');
        pdf.text('DCEL', MARGIN + 10, logoY + 20);
      }
    } else {
      // Simple circle placeholder
      pdf.setFillColor(200, 200, 200);
      pdf.circle(MARGIN + 15, logoY + 15, 15, 'F');
      pdf.setFontSize(9);
      pdf.setFont('times', 'bold');
      pdf.text('DCEL', MARGIN + 10, logoY + 20);
    }

    // Title below, centered
    headerY += 45; // Space after logo/company row
    pdf.setFontSize(24);
    pdf.setFont('times', 'bold');
    const title = type === 'return' ? 'RETURNS' : 'WAYBILL';
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pageWidth - titleWidth) / 2, headerY);

    headerY += 20;

    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');

    // Waybill No (left-aligned at margin, bold)
    pdf.text(`Waybill No: ${waybill.id}`, MARGIN, headerY);
    headerY += 8;

    // Date (left-aligned at margin, bold)
    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Ensure we have a proper Date object
    const sentDate = waybill.sentToSiteDate ? new Date(waybill.sentToSiteDate) : null;
    const issueDate = new Date(waybill.issueDate);
    const effectiveDate = sentDate || issueDate;

    // Format as ordinal (11th December 2025)
    const day = effectiveDate.getDate();
    const monthYear = effectiveDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const dateText = `${getOrdinal(day)} ${monthYear}`;
    pdf.text(`Date: ${dateText}`, MARGIN, headerY);
    headerY += 8;

    // Driver Name (left-aligned at margin, bold)
    pdf.text(`Driver Name: ${waybill.driverName}`, MARGIN, headerY);
    headerY += 8;

    // Vehicle (left-aligned at margin, bold)
    if (waybill.vehicle) {
      const vehicleObj = vehicles?.find(v => v.name === waybill.vehicle);
      const regNum = vehicleObj?.registration_number;
      const vehicleText = regNum
        ? `Vehicle: ${waybill.vehicle} (${regNum})`
        : `Vehicle: ${waybill.vehicle}`;
      pdf.text(vehicleText, MARGIN, headerY);
      headerY += 8;
    }

    headerY += 5;

    return headerY;
  };

  // Function to render footer (on every page bottom)
  const renderFooter = () => {
    const footerY = pageHeight - MARGIN - 18; // 0.5" bottom margin

    // Signed (left-aligned at margin)
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text('Signed', MARGIN, footerY);

    // Underline (left-aligned, 100mm wide)
    pdf.setDrawColor(0, 0, 0);
    pdf.line(MARGIN, footerY + 2, MARGIN + 100, footerY + 2);

    // Company name below (left-aligned at margin)
    pdf.setFontSize(12);
    pdf.setFont('times', 'italic');
    pdf.text(defaultCompanySettings.companyName, MARGIN, footerY + 8);
  };

  let yPos = await renderHeader();

  // Subtitle (centered, only on first page, multi-line if needed)
  const safeService = waybill.service || 'dewatering';
  const capitalizedService = safeService.charAt(0).toUpperCase() + safeService.slice(1);
  const firstPageSubtitle = type === 'return'
    ? `Materials Returns for ${capitalizedService} from ${toLocation} to ${fromLocation}`
    : `Materials Waybill for ${capitalizedService} from ${fromLocation} to ${toLocation}`;

  // Set font BEFORE splitTextToSize so measurement matches the rendered 14pt bold size
  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const splitFirstSubtitle = pdf.splitTextToSize(firstPageSubtitle, contentWidth);
  // Use align:'center' so each wrapped line is individually centered on the page
  pdf.text(splitFirstSubtitle, pageWidth / 2, yPos, { align: 'center' });
  pdf.setFontSize(12);
  pdf.setFont('times', 'normal');
  yPos += splitFirstSubtitle.length * 7 + 10;

  // Render footer on first page
  renderFooter();

  // Items List — flow-fill 2-column layout (fills left column first, then right)
  pdf.setFontSize(12);
  pdf.setFont('times', 'normal');
  if (waybill.items.length === 0) {
    pdf.text('No items listed', MARGIN, yPos);
  } else {
    const colWidth = contentWidth / 2 - 5;       // width of each column
    const colRightX = MARGIN + contentWidth / 2 + 5; // x start of right column
    const footerTop = pageHeight - MARGIN - 30;  // where footer begins — stop before this

    let currentX = MARGIN;   // start in left column
    let currentY = yPos;
    let inRightCol = false;

    for (const [index, item] of waybill.items.entries()) {
      const lines = pdf.splitTextToSize(
        `${index + 1}. ${item.assetName} (${item.quantity})`,
        colWidth
      );
      const lineH = lines.length * 7;

      // Check if item fits in the current column
      if (currentY + lineH > footerTop) {
        if (!inRightCol) {
          // Left column full — switch to right column, reset Y
          inRightCol = true;
          currentX = colRightX;
          currentY = yPos;
        } else {
          // Both columns full — add new page and restart from left column
          pdf.addPage();
          const newHeaderY = await renderHeader();
          renderFooter();
          currentX = MARGIN;
          currentY = newHeaderY + 10;
          inRightCol = false;
        }
      }

      pdf.text(lines, currentX, currentY);
      currentY += lineH;
    }

    // Render footer on the last page
    renderFooter();
  }

  // If a signature URL is provided, attempt to place it
  if (signatureUrl) {
    console.log('Rendering signature to PDF:', { signatureUrl: signatureUrl?.substring(0, 50) + '...', signatureName });
    try {
      const img = await loadImage(signatureUrl);
      const sigWidth = 35; // signature width in mm
      const sigHeight = (img.height / img.width) * sigWidth;

      // Layout: [Signed label] [Signature Image] [Name text]
      // Signed label is at x=MARGIN, y=pageHeight - MARGIN - 18
      const signedLabelX = MARGIN;
      const signedLabelY = pageHeight - MARGIN - 18;

      // Place signature image right after "Signed" label
      const sigX = signedLabelX + 25; // Start after "Signed" text
      const sigY = signedLabelY - sigHeight + 3; // Align bottom with text baseline

      let format: any = undefined;
      // Simple format detection
      if (signatureUrl.startsWith('data:image/png')) format = 'PNG';
      else if (signatureUrl.startsWith('data:image/jpeg') || signatureUrl.startsWith('data:image/jpg')) format = 'JPEG';

      if (format) {
        pdf.addImage(signatureUrl, format, sigX, sigY, sigWidth, sigHeight);
      } else {
        pdf.addImage(signatureUrl, 'PNG', sigX, sigY, sigWidth, sigHeight);
      }

      // Add name text beside the signature
      if (signatureName) {
        const textX = sigX + sigWidth + 5; // 5mm gap after signature
        const textY = signedLabelY - 3; // Align with signature middle

        pdf.setFontSize(9);
        pdf.setFont('times', 'bold');
        pdf.text(signatureName, textX, textY);
      }

      console.log('Signature added to PDF successfully');
    } catch (e) {
      console.error('Could not add signature to PDF', e);
      logger.warn('Could not add signature to PDF', e);
    }
  } else {
    console.log('No signature URL provided to PDF generator');
  }



  // Return the PDF instance for external handling (save/print)
  const fileName = `${type === 'return' ? 'Return' : 'Waybill'}_for_${waybill.service}_${toLocation.replace(/\s+/g, '_')}.pdf`;
  return { pdf, fileName };
};
