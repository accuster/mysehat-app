// utils/generateReceiptPdf.ts - Payment Receipt PDF Generator
import { generatePDF } from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import { Share, Platform } from 'react-native';
import SendIntentAndroid from 'react-native-send-intent';

export interface ReceiptData {
  // Transaction details
  amountLabel: string;        // e.g., "₹199"
  refNumber: string;          // Order ID: "ORD0226000044"
  paymentTime: string;        // "05-Feb-2026, 12:34 pm"
  paymentMethod: string;      // "UPI", "Card", "NetBanking"
  senderName: string;         // "Twinkle gupta"
  paymentId: string;          // Transaction ID: "pay_SCN764xobKjKk0"
  
  // Optional fields
  reportId?: string;          // Health report ID (if applicable)
  userMobile?: string;        // User mobile number
  merchantName?: string;      // Default: "MySehat.ai"
}

/**
 * Generate HTML template for Payment Receipt PDF
 */
function generateReceiptHTMLTemplate(data: ReceiptData): string {
  const merchantName = data.merchantName || 'MySehat.ai';
  const currentDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      padding: 20px;
      color: #111827;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 2px solid #E5E7EB;
    }
    
    /* Header Section */
    .header {
      text-align: center;
      border-bottom: 3px solid #7C3AED;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    
    .brand {
      font-size: 28px;
      font-weight: 900;
      color: #7C3AED;
      margin-bottom: 8px;
    }
    
    .receipt-title {
      font-size: 18px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    /* Success Badge */
    .success-badge {
      background: #D1FAE5;
      border: 2px solid #10B981;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin-bottom: 32px;
    }
    
    .success-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }
    
    .success-text {
      font-size: 20px;
      font-weight: 800;
      color: #065F46;
      margin-bottom: 4px;
    }
    
    .success-subtext {
      font-size: 14px;
      color: #047857;
    }
    
    /* Amount Section */
    .amount-section {
      background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin-bottom: 32px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    }
    
    .amount-label {
      font-size: 14px;
      color: #E9D5FF;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .amount-value {
      font-size: 48px;
      font-weight: 900;
      color: #FFFFFF;
    }
    
    /* Transaction Details */
    .details-section {
      margin-bottom: 32px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: #111827;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E5E7EB;
    }
    
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    .detail-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
    }
    
    .detail-label {
      font-size: 12px;
      color: #6B7280;
      font-weight: 600;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .detail-value {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      word-break: break-word;
    }
    
    .detail-value.highlight {
      color: #7C3AED;
      font-weight: 800;
    }
    
    /* Full-width detail box */
    .detail-box-full {
      grid-column: 1 / -1;
    }
    
    /* Important Notes */
    .notes-section {
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 32px;
    }
    
    .notes-title {
      font-size: 13px;
      font-weight: 700;
      color: #92400E;
      margin-bottom: 8px;
    }
    
    .notes-text {
      font-size: 12px;
      color: #92400E;
      line-height: 1.6;
    }
    
    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
    }
    
    .footer-text {
      font-size: 12px;
      color: #6B7280;
      line-height: 1.8;
    }
    
    .footer-text strong {
      color: #111827;
      font-weight: 700;
    }
    
    .footer-brand {
      font-size: 14px;
      font-weight: 800;
      color: #7C3AED;
      margin-top: 12px;
    }
    
    /* Print Styles */
    @media print {
      body {
        padding: 0;
      }
      .container {
        box-shadow: none;
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="brand">${merchantName}</div>
      <div class="receipt-title">Payment Receipt</div>
    </div>
    
    <!-- Success Badge -->
    <div class="success-badge">
      <div class="success-icon">✓</div>
      <div class="success-text">Payment Successful</div>
      <div class="success-subtext">Your transaction has been completed</div>
    </div>
    
    <!-- Amount Section -->
    <div class="amount-section">
      <div class="amount-label">Amount Paid</div>
      <div class="amount-value">${data.amountLabel}</div>
    </div>
    
    <!-- Transaction Details -->
    <div class="details-section">
      <div class="section-title">Transaction Details</div>
      <div class="details-grid">
        <div class="detail-box">
          <div class="detail-label">Order ID</div>
          <div class="detail-value">${data.refNumber}</div>
        </div>
        
        <div class="detail-box">
          <div class="detail-label">Payment Time</div>
          <div class="detail-value">${data.paymentTime}</div>
        </div>
        
        <div class="detail-box">
          <div class="detail-label">Payment Method</div>
          <div class="detail-value highlight">${data.paymentMethod}</div>
        </div>
        
        <div class="detail-box">
          <div class="detail-label">Paid By</div>
          <div class="detail-value">${data.senderName}</div>
        </div>
        
        <div class="detail-box detail-box-full">
          <div class="detail-label">Transaction ID</div>
          <div class="detail-value">${data.paymentId}</div>
        </div>
        
        ${data.reportId ? `
        <div class="detail-box detail-box-full">
          <div class="detail-label">Report ID</div>
          <div class="detail-value">${data.reportId}</div>
        </div>
        ` : ''}
        
        ${data.userMobile ? `
        <div class="detail-box detail-box-full">
          <div class="detail-label">Mobile Number</div>
          <div class="detail-value">${data.userMobile}</div>
        </div>
        ` : ''}
      </div>
    </div>
    
    <!-- Important Notes -->
    <div class="notes-section">
      <div class="notes-title">⚠️ Important Information</div>
      <div class="notes-text">
        This is a computer-generated receipt and does not require a physical signature. 
        Please retain this receipt for your records. For any queries, please contact our 
        support team with your transaction ID.
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">
        <strong>Thank you for choosing ${merchantName}</strong><br>
        Receipt generated on ${currentDate}<br>
        This is an official receipt for your payment transaction.
      </div>
      <div class="footer-brand">${merchantName}</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate and save Payment Receipt PDF to app-specific directory
 * @param data - Receipt data to generate PDF from
 * @returns Promise with file path
 */
export async function generateReceiptPdf(data: ReceiptData): Promise<string> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧾 Starting Receipt PDF generation...');
    console.log('Order ID:', data.refNumber);
    console.log('Amount:', data.amountLabel);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ Generate HTML content
    const htmlContent = generateReceiptHTMLTemplate(data);

    // ✅ Generate unique filename (without .pdf extension, library adds it)
    const timestamp = Date.now();
    const sanitizedOrderId = data.refNumber.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `MySehat_Receipt_${sanitizedOrderId}_${timestamp}`;
    const finalFileName = `${fileName}.pdf`;

    // ✅ Use app-specific external directory (zero permissions needed)
    const safePath =
      Platform.OS === 'android'
        ? RNFS.ExternalDirectoryPath
        : RNFS.DocumentDirectoryPath;

    console.log('Safe path:', safePath);

    // ✅ Generate PDF in temp location first
    const options = {
      html: htmlContent,
      fileName: fileName,
      directory: 'Documents', // Temp location
      base64: false,
    };

    console.log('Generating PDF with filename:', fileName);

    // ✅ Generate PDF
    const result = await generatePDF(options);
    
    console.log('PDF generated successfully at temp location:', result.filePath);
    
    if (!result.filePath) {
      throw new Error('Failed to generate PDF - no file path returned');
    }

    // ✅ Ensure target directory exists
    const dirExists = await RNFS.exists(safePath);
    if (!dirExists) {
      console.log('Creating directory:', safePath);
      await RNFS.mkdir(safePath);
    }

    // ✅ Move file to safe production path
    const finalPath = `${safePath}/${finalFileName}`;

    console.log('Moving PDF to safe production path...');
    console.log('From:', result.filePath);
    console.log('To:', finalPath);

    await RNFS.moveFile(result.filePath, finalPath);

    console.log('✅ PDF moved to production path successfully!');
    console.log('Final PDF path:', finalPath);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return finalPath;
  } catch (error: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ Receipt PDF Generation Error');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw new Error(error.message || 'Failed to generate receipt PDF');
  }
}

/**
 * Share Receipt PDF using FileProvider (Google Play compliant)
 * Uses react-native-send-intent for reliable Android sharing
 */
export async function shareReceiptPdf(filePath: string): Promise<void> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 shareReceiptPdf: Starting...');
    console.log('File path:', filePath);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // ✅ Check if file exists
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      console.log('❌ Receipt PDF file not found at:', filePath);
      throw new Error('Receipt PDF file not found');
    }

    console.log('✅ File exists, proceeding to share...');

    if (Platform.OS === 'android') {
      // ✅ ANDROID: Use SendIntent for proper FileProvider sharing
      console.log('📱 Android detected - using SendIntent');
      
      try {
        await SendIntentAndroid.openFileChooser(
          {
            subject: 'MySehat Payment Receipt',
            fileUrl: filePath,
            type: 'application/pdf',
          },
          'Share Payment Receipt'
        );
        
        console.log('✅ SendIntent share dialog opened successfully');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } catch (sendIntentError: any) {
        console.log('❌ SendIntent failed:', sendIntentError);
        
        // ✅ FALLBACK: Try using file:// URL with Share API
        console.log('⚠️ Attempting fallback method...');
        
        const fileUrl = `file://${filePath}`;
        console.log('File URL:', fileUrl);
        
        await Share.share({
          title: 'Share MySehat Payment Receipt',
          message: 'Here is my payment receipt from MySehat',
          url: fileUrl,
        });
        
        console.log('✅ Fallback share completed');
      }
    } else {
      // ✅ iOS: Use file:// URL
      console.log('📱 iOS detected - using Share.share');
      
      await Share.share({
        title: 'Share MySehat Payment Receipt',
        message: 'Here is my payment receipt from MySehat',
        url: `file://${filePath}`,
      });
      
      console.log('✅ iOS share completed');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  } catch (error: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ shareReceiptPdf: FAILED');
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    throw new Error('Failed to share receipt: ' + error.message);
  }
}