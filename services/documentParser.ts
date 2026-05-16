import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const cleanExtractedText = (text: string) => text.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

export const extractDocumentText = async (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (['txt', 'md', 'csv', 'json'].includes(extension) || file.type.startsWith('text/')) {
    const text = await file.text();
    const cleaned = cleanExtractedText(text);
    if (!cleaned) {
      throw new Error('The selected file is empty.');
    }
    return cleaned;
  }

  if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');

      if (pageText.trim()) {
        pages.push(pageText);
      }
    }

    const cleaned = cleanExtractedText(pages.join('\n\n'));
    if (!cleaned) {
      throw new Error('Could not extract readable text from this PDF.');
    }

    return cleaned;
  }

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    const cleaned = cleanExtractedText(value);

    if (!cleaned) {
      throw new Error('Could not extract readable text from this DOCX file.');
    }

    return cleaned;
  }

  throw new Error('Supported AI-ready uploads are PDF, DOCX, TXT, MD, CSV, and JSON.');
};

export const isAiReadyUpload = (file: File) => /\.(pdf|docx|txt|md|csv|json)$/i.test(file.name);
