// utils/generateReportPdf.ts - FIXED: Uses FileProvider for Android sharing (Google Play compliant)
import { generatePDF } from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import { Share, Platform } from 'react-native';
import SendIntentAndroid from 'react-native-send-intent';

export interface ReportData {
  timestamp: string;
  reportId: string;
  patientName: string;
  age: number;
  gender: 'M' | 'F' | 'Male' | 'Female' | 'O' | 'Other';
  heightCm: number;
  weightKg: number;
  bmi: number;
  bmiStatus: string;
  idealWeightKg: number;
  bodyFatPct: number;
  fatMassKg: number;
  leanBodyMassKg: number;
  healthScore: number;
}

/**
 * Format gender for display
 */
function formatGender(g: string): string {
  if (g === 'M' || g === 'Male') return 'Male';
  if (g === 'F' || g === 'Female') return 'Female';
  return 'Other';
}

/**
 * Generate HTML template for PDF
 */
function generateHTMLTemplate(data: ReportData): string {
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
      padding: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .header {
      text-align: center;
      border-bottom: 2px solid #E5E7EB;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    
    .brand {
      color: #6B7280;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .title {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      margin-bottom: 10px;
    }
    
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
    }
    
    .meta-box {
      background: #F9FAFB;
      border-radius: 12px;
      padding: 15px;
      border: 1px solid #E5E7EB;
    }
    
    .meta-label {
      font-size: 12px;
      color: #6B7280;
      margin-bottom: 5px;
    }
    
    .meta-value {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }
    
    .section {
      margin: 25px 0;
    }
    
    .section-label {
      font-size: 12px;
      color: #6B7280;
      margin-bottom: 8px;
    }
    
    .patient-name {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 5px;
    }
    
    .patient-meta {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 15px;
    }
    
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin: 15px 0;
    }
    
    .badge {
      display: inline-block;
      border: 1px solid #E5E7EB;
      border-radius: 999px;
      padding: 6px 14px;
      background: #F9FAFB;
      font-size: 12px;
      font-weight: 600;
    }
    
    .score {
      font-size: 12px;
      color: #6B7280;
      margin-left: auto;
    }
    
    .score-value {
      font-weight: 800;
      color: #111827;
      font-size: 14px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 800;
      margin: 25px 0 15px 0;
      color: #111827;
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .table tr {
      border-bottom: 1px solid #E5E7EB;
    }
    
    .table tr:last-child {
      border-bottom: none;
    }
    
    .table td {
      padding: 14px;
      font-size: 14px;
    }
    
    .table tr:nth-child(even) {
      background: #F9FAFB;
    }
    
    .table td:first-child {
      color: #374151;
      font-weight: 500;
    }
    
    .table td:last-child {
      font-weight: 700;
      color: #111827;
      text-align: right;
    }
    
    .disclaimer {
      margin-top: 25px;
      padding: 15px;
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      border-radius: 8px;
      font-size: 12px;
      color: #92400E;
      line-height: 1.6;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
    
    .footer strong {
      color: #111827;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="brand">MySehat.ai</div>
      <div class="title">Body Composition Report</div>
    </div>
    
    <!-- Meta Information -->
    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-label">Timestamp</div>
        <div class="meta-value">${data.timestamp}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Report ID</div>
        <div class="meta-value">${data.reportId}</div>
      </div>
    </div>
    
    <!-- Patient Information -->
    <div class="section">
      <div class="section-label">Patient Information</div>
      <div class="patient-name">${data.patientName}</div>
      <div class="patient-meta">${data.age} years / ${formatGender(data.gender)}</div>
      
      <div class="badges">
        <span class="badge">BMI: ${data.bmi}</span>
        <span class="badge">${data.bmiStatus}</span>
        <span class="score">Health Score: <span class="score-value">${data.healthScore}/100</span></span>
      </div>
    </div>
    
    <!-- Main Report -->
    <div class="section-title">Detailed Measurements</div>
    
    <table class="table">
      <tr>
        <td>Height</td>
        <td>${data.heightCm} cm</td>
      </tr>
      <tr>
        <td>Weight</td>
        <td>${data.weightKg} kg</td>
      </tr>
      <tr>
        <td>BMI (Body Mass Index)</td>
        <td>${data.bmi}</td>
      </tr>
      <tr>
        <td>BMI Status</td>
        <td>${data.bmiStatus}</td>
      </tr>
      <tr>
        <td>Ideal Weight</td>
        <td>${data.idealWeightKg} kg</td>
      </tr>
      <tr>
        <td>Body Fat Percentage</td>
        <td>${data.bodyFatPct}%</td>
      </tr>
      <tr>
        <td>Fat Mass</td>
        <td>${data.fatMassKg} kg</td>
      </tr>
      <tr>
        <td>Lean Body Mass</td>
        <td>${data.leanBodyMassKg} kg</td>
      </tr>
      <tr>
        <td>Health Score</td>
        <td>${data.healthScore}/100</td>
      </tr>
    </table>
    
    <!-- Disclaimer -->
    <div class="disclaimer">
      <strong>⚠️ Important Disclaimer:</strong><br>
      This report is generated for informational purposes only and does not replace professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns.
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <strong>MySehat.ai</strong> - Your Health Companion<br>
      Report generated on ${data.timestamp}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate and save PDF report to PUBLIC Downloads folder
 * @param data - Report data to generate PDF from
 * @returns Promise with file path to PUBLIC Downloads folder
 */
export async function generateReportPdf(data: ReportData): Promise<string> {
  try {
    console.log('Starting PDF generation...');

    // ✅ Generate HTML content
    const htmlContent = generateHTMLTemplate(data);

    // ✅ Generate unique filename (without .pdf extension, library adds it)
    const timestamp = Date.now();
    const fileName = `MySehat_Report_${data.reportId}_${timestamp}`;
    const finalFileName = `${fileName}.pdf`;

    // ✅ Generate PDF in temp location first
    const options = {
      html: htmlContent,
      fileName: fileName,
      directory: 'Documents', // Temp location
      base64: false,
    };

    console.log('Generating PDF with options:', fileName);

    // ✅ Generate PDF
    const result = await generatePDF(options);
    
    console.log('PDF generated successfully at temp location:', result.filePath);
    
    if (!result.filePath) {
      throw new Error('Failed to generate PDF - no file path returned');
    }

    // ✅ Copy to PUBLIC Downloads folder
    const publicDownloadsPath = RNFS.DownloadDirectoryPath;
    const finalPath = `${publicDownloadsPath}/${finalFileName}`;

    console.log('Copying PDF to public Downloads folder...');
    console.log('From:', result.filePath);
    console.log('To:', finalPath);

    // Copy file to public Downloads
    await RNFS.copyFile(result.filePath, finalPath);

    console.log('✅ PDF copied to public Downloads successfully!');

    // Delete temp file
    try {
      await RNFS.unlink(result.filePath);
      console.log('Temp file deleted');
    } catch (e) {
      console.log('Could not delete temp file:', e);
    }

    console.log('Final PDF path:', finalPath);
    
    return finalPath;
  } catch (error: any) {
    console.log('PDF Generation Error:', error);
    throw new Error(error.message || 'Failed to generate PDF');
  }
}


/**
 * ✅ FIXED: Share PDF using FileProvider (Google Play compliant)
 * Uses react-native-send-intent for reliable Android sharing
 */
export async function shareReportPdf(filePath: string): Promise<void> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 shareReportPdf: Starting...');
    console.log('File path:', filePath);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // ✅ Check if file exists
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      console.log('❌ PDF file not found at:', filePath);
      throw new Error('PDF file not found');
    }

    console.log('✅ File exists, proceeding to share...');

    if (Platform.OS === 'android') {
      // ✅ ANDROID: Use SendIntent for proper FileProvider sharing
      console.log('📱 Android detected - using SendIntent');
      
      try {
        await SendIntentAndroid.openFileChooser(
          {
            subject: 'MySehat Health Report',
            fileUrl: filePath,
            type: 'application/pdf',
          },
          'Share Health Report'
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
          title: 'Share MySehat Health Report',
          message: 'Here is my health report from MySehat',
          url: fileUrl,
        });
        
        console.log('✅ Fallback share completed');
      }
    } else {
      // ✅ iOS: Use file:// URL
      console.log('📱 iOS detected - using Share.share');
      
      await Share.share({
        title: 'Share MySehat Health Report',
        message: 'Here is my health report from MySehat',
        url: `file://${filePath}`,
      });
      
      console.log('✅ iOS share completed');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  } catch (error: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ shareReportPdf: FAILED');
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    throw new Error('Failed to share report: ' + error.message);
  }
}