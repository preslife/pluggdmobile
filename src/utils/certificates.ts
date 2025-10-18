import jsPDF from 'jspdf';

export interface CourseCertificatePayload {
  courseTitle: string;
  userName: string;
  completionDate: string;
  certificateId?: string;
}

/**
 * Generates a simple course completion certificate PDF and triggers a download.
 */
export const generateCourseCertificatePdf = ({
  courseTitle,
  userName,
  completionDate,
  certificateId
}: CourseCertificatePayload) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor('#f8fafc');
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setDrawColor('#0f172a');
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('Certificate of Completion', pageWidth / 2, 55, { align: 'center' });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text('This certifies that', pageWidth / 2, 80, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(userName || 'Student', pageWidth / 2, 105, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(18);
  doc.text('has successfully completed the course', pageWidth / 2, 130, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(courseTitle, pageWidth / 2, 155, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text(`Date: ${new Date(completionDate).toLocaleDateString()}`, pageWidth / 2, 185, { align: 'center' });

  if (certificateId) {
    doc.setFontSize(12);
    doc.text(`Certificate ID: ${certificateId}`, pageWidth / 2, 200, { align: 'center' });
  }

  doc.save(`certificate-${certificateId ?? Date.now()}.pdf`);
};
