// ===========================
// PDF EXPORT FUNCTIONALITY
// Python-Based PDF Export using reportlab
// ===========================

/**
 * Extract content from element including HTML tables converted to markdown
 */
function extractContentWithTables(element) {
  if (!element) return '';
  
  let content = '';
  const clone = element.cloneNode(true);
  
  // Find all tables and convert to markdown
  const tables = clone.querySelectorAll('table');
  tables.forEach(table => {
    const markdown = convertTableToMarkdown(table);
    table.replaceWith(document.createTextNode(markdown));
  });
  
  // Get text content with preserved line breaks
  content = clone.textContent || clone.innerText || '';
  
  return content.trim();
}

/**
 * Convert HTML table to markdown table format
 */
function convertTableToMarkdown(table) {
  let markdown = '\n\n';
  const rows = table.querySelectorAll('tr');
  
  if (rows.length === 0) return '';
  
  rows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll('th, td');
    const cellTexts = Array.from(cells).map(cell => {
      return cell.textContent.trim().replace(/\|/g, '\\|');
    });
    
    markdown += '| ' + cellTexts.join(' | ') + ' |\n';
    
    // Add separator after header row
    if (rowIndex === 0) {
      const separator = cellTexts.map(() => '---').join(' | ');
      markdown += '| ' + separator + ' |\n';
    }
  });
  
  markdown += '\n';
  return markdown;
}

/**
 * Export Consistency Analysis to PDF
 */
async function exportConsistencyToPDF(userMessage, assistantMessage) {
  return await exportToPDFByType(userMessage, assistantMessage, 'consistency', 'Consistency Analysis Report');
}

/**
 * Export Measurability Analysis to PDF
 */
async function exportMeasurabilityToPDF(userMessage, assistantMessage) {
  return await exportToPDFByType(userMessage, assistantMessage, 'measurability', 'Measurability Analysis Report');
}

/**
 * Export Relevance Analysis to PDF
 */
async function exportRelevanceToPDF(userMessage, assistantMessage) {
  return await exportToPDFByType(userMessage, assistantMessage, 'relevance', 'Relevance Analysis Report');
}

/**
 * Export Presentation Analysis to PDF
 */
async function exportPresentationToPDF(userMessage, assistantMessage) {
  return await exportToPDFByType(userMessage, assistantMessage, 'presentation', 'Presentation Analysis Report');
}

/**
 * Generic export function used by all report types
 * This function collects messages from the chat content and sends them to the backend
 */
async function exportToPDFByType(userMessage, assistantMessage, reportType, reportTitle) {
  console.log(`[DEBUG exportToPDF] Function called for ${reportType}`);
  try {
    // Prepare messages array - only assistant messages for professional report
    const messages = [];
    
    if (assistantMessage) {
      // Extract content preserving HTML structure for tables
      const content = extractContentWithTables(assistantMessage);
      messages.push({
        role: 'assistant',
        content: content,
        timestamp: Date.now()
      });
    }

    if (messages.length === 0) {
      throw new Error('No assistant message to export');
    }

    console.log(`[DEBUG exportToPDF] Sending ${messages.length} messages to backend for ${reportType} PDF generation`);

    // Call backend to generate PDF using Python
    const response = await fetch('http://localhost:3000/api/export-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        messages,
        reportType,
        reportTitle
      })
    });

    console.log('[DEBUG exportToPDF] Response received, status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
      throw new Error(error.error || 'Failed to generate PDF');
    }

    // Get PDF blob
    const blob = await response.blob();
    console.log('[DEBUG exportToPDF] Blob received, size:', blob.size);
    
    // Create download link with display:none to prevent page jump
    const url = window.URL.createObjectURL(blob);
    console.log('[DEBUG exportToPDF] Blob URL created:', url);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.style.position = 'absolute';
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = reportType ? `${reportType}-report-${dateStr}.pdf` : `chat-export-${dateStr}.pdf`;
    a.download = fileName;
    a.target = '_self';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    
    console.log('[DEBUG exportToPDF] Download link appended to body');
    
    // Use setTimeout to ensure the element is in DOM before clicking
    setTimeout(() => {
      console.log('[DEBUG exportToPDF] About to click download link');
      a.click();
      console.log('[DEBUG exportToPDF] Download link clicked');
      
      // Cleanup after download starts
      setTimeout(() => {
        console.log('[DEBUG exportToPDF] Cleaning up');
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('[DEBUG exportToPDF] Cleanup complete');
      }, 100);
    }, 0);
    
    console.log(`[DEBUG exportToPDF] ${reportType || 'Generic'} PDF exported successfully`);
    showAlert(`✅ ${reportTitle || 'PDF'} exported successfully!`, 'success');

  } catch (error) {
    console.error(`[DEBUG exportToPDF] ${reportType || 'Generic'} PDF export failed:`, error);
    showAlert(`Failed to export ${reportTitle || 'PDF'}: ${error.message}`, 'error');
  }
  
  console.log(`[DEBUG exportToPDF] ${reportType || 'Generic'} function ending`);
}

/**
 * Legacy function for backward compatibility
 * Defaults to generic export
 */
async function exportToPDF(userMessage, assistantMessage) {
  return await exportToPDFByType(userMessage, assistantMessage, 'general', 'Chat Export');
}

/**
 * Export all chat messages to PDF
 * Collects all user and assistant messages from the chat content
 */
async function exportAllChatToPDF() {
  try {
    const chatDiv = document.getElementById('chatContent');
    if (!chatDiv) {
      throw new Error('Chat content not found');
    }

    // Collect all messages
    const messages = [];
    const messageElements = chatDiv.querySelectorAll('.user-msg, .assistant-msg');
    
    messageElements.forEach(el => {
      const isUser = el.classList.contains('user-msg');
      // Only include assistant messages for professional report
      if (!isUser) {
        const content = extractContentWithTables(el);
        messages.push({
          role: 'assistant',
          content: content,
          timestamp: Date.now()
        });
      }
    });

    if (messages.length === 0) {
      throw new Error('No messages to export');
    }

    console.log('Exporting', messages.length, 'messages to PDF');

    // Call backend to generate PDF
    const response = await fetch('http://localhost:3000/api/export-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
      throw new Error(error.error || 'Failed to generate PDF');
    }

    // Get PDF blob
    const blob = await response.blob();
    
    // Create download link with display:none to prevent page jump
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.style.position = 'absolute';
    a.href = url;
    a.download = `chat-export-all-${new Date().toISOString().split('T')[0]}.pdf`;
    a.target = '_self';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    
    // Use setTimeout to ensure the element is in DOM before clicking
    setTimeout(() => {
      a.click();
      
      // Cleanup after download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    }, 0);
    
    console.log('PDF exported successfully');
    showAlert('✅ PDF exported successfully!', 'success');

  } catch (error) {
    console.error('PDF export failed:', error);
    showAlert(`Failed to export PDF: ${error.message}`, 'error');
  }
}

/**
 * Check if backend is available for PDF generation
 */
async function isPDFServiceAvailable() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    return response.ok;
  } catch {
    return false;
  }
}

// Verify service on load
window.addEventListener('load', async () => {
  const available = await isPDFServiceAvailable();
  if (!available) {
    console.warn('PDF export service not available. Make sure the backend server is running on port 3000.');
  }
});
