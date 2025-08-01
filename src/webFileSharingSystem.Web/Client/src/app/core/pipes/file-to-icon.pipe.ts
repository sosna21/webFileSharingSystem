import { Pipe, PipeTransform } from '@angular/core';
import { AppFile } from '../models/app-file.model';

@Pipe({
  name: 'fileToIcon'
})
export class FileToIconPipe implements PipeTransform {
  transform(file: AppFile): string {
    if (!file) return 'bi-file-earmark text-secondary';

    // Folders
    if (file.isDirectory) {
      return 'bi-folder-fill text-warning';
    }

    const mime = file.mimeType ?? '';
    const match = mimeToBootstrapIcon[mime];
    if (match) {
      return `bi-${match.icon} ${match.color}`;
    }

    // Fallbacks for major MIME types
    if (mime.startsWith('image/')) return 'bi-file-earmark-image text-warning-emphasis';
    if (mime.startsWith('video/')) return 'bi-file-earmark-play text-dark-emphasis';
    if (mime.startsWith('audio/')) return 'bi-file-earmark-music text-info-emphasis';
    if (mime.startsWith('text/')) return 'bi-file-earmark-text text-body-emphasis';
    if (mime.startsWith('application/')) return 'bi-file-earmark-code text-body-emphasis';

    // Final fallback
    return 'bi-file-earmark text-secondary';
  }
}

const mimeToBootstrapIcon: Record<string, { icon: string, color: string }> = {
  // 📄 Documents
  'application/pdf': { icon: 'file-earmark-pdf', color: 'text-danger' },
  'application/msword': { icon: 'file-earmark-word', color: 'text-primary-emphasis' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'file-earmark-word', color: 'text-primary-emphasis' },
  'application/vnd.ms-powerpoint': { icon: 'file-earmark-slides', color: 'text-warning' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: 'file-earmark-slides', color: 'text-warning-emphasis' },
  'application/rtf': { icon: 'file-earmark-text', color: 'text-body' },

  // 💻 Code
  'application/json': { icon: 'file-earmark-code', color: 'text-secondary' },
  'application/javascript': { icon: 'file-earmark-code', color: 'text-secondary-emphasis' },
  'text/html': { icon: 'file-earmark-code', color: 'text-orange' }, // add class in CSS
  'text/css': { icon: 'file-earmark-code', color: 'text-info-emphasis' },

  // 🖼️ Images
  'image/jpeg': { icon: 'file-earmark-image', color: 'text-warning' },
  'image/png': { icon: 'file-earmark-image', color: 'text-warning-emphasis' },
  'image/gif': { icon: 'file-earmark-image', color: 'text-warning-emphasis' },
  'image/svg+xml': { icon: 'file-earmark-image', color: 'text-warning' },
  'image/webp': { icon: 'file-earmark-image', color: 'text-warning-emphasis' },

  // 🎥 Video
  'video/mp4': { icon: 'file-earmark-play', color: 'text-danger-emphasis' },
  'video/x-msvideo': { icon: 'file-earmark-play', color: 'text-danger-emphasis' },
  'video/webm': { icon: 'file-earmark-play', color: 'text-danger-emphasis' },

  // 🎵 Audio
  'audio/mpeg': { icon: 'file-earmark-music', color: 'text-info' },
  'audio/wav': { icon: 'file-earmark-music', color: 'text-info-emphasis' },
  'audio/ogg': { icon: 'file-earmark-music', color: 'text-info-emphasis' },

  // 📦 Archives
  'application/zip': { icon: 'file-earmark-zip', color: 'text-muted' },
  'application/x-7z-compressed': { icon: 'file-earmark-zip', color: 'text-muted' },
  'application/x-rar-compressed': { icon: 'file-earmark-zip', color: 'text-muted' },
  'application/x-tar': { icon: 'file-earmark-zip', color: 'text-muted' },

  // 📝 Text
  'text/plain': { icon: 'file-earmark-text', color: 'text-body' },
  'text/markdown': { icon: 'file-earmark-text', color: 'text-body-emphasis' },
  'text/x-log': { icon: 'file-earmark-text', color: 'text-secondary-emphasis' },

  // 📄 Office templates
  'application/vnd.oasis.opendocument.text': { icon: 'file-earmark-richtext', color: 'text-primary' },

  // ✅ Excel and spreadsheet files
  'application/vnd.ms-excel': { icon: 'file-earmark-excel', color: 'text-success' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'file-earmark-excel', color: 'text-success-emphasis' },
  'application/vnd.ms-excel.sheet.macroEnabled.12': { icon: 'file-earmark-excel', color: 'text-success-emphasis' },
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12': { icon: 'file-earmark-excel', color: 'text-success-emphasis' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.template': { icon: 'file-earmark-excel', color: 'text-success-emphasis' },
  'application/vnd.ms-excel.template.macroEnabled.12': { icon: 'file-earmark-excel', color: 'text-success' },
  'application/vnd.ms-excel.addin.macroEnabled.12': { icon: 'file-earmark-excel', color: 'text-success' },
  'application/vnd.oasis.opendocument.spreadsheet': { icon: 'file-earmark-excel', color: 'text-success-emphasis' },
  'application/xml': { icon: 'file-earmark-excel', color: 'text-success' },
  'text/csv': { icon: 'file-earmark-spreadsheet', color: 'text-success-emphasis' },

  // 🔒 Security files
  'application/x-pem-file': { icon: 'shield-lock', color: 'text-secondary-emphasis' },
  'application/x-x509-ca-cert': { icon: 'shield-lock', color: 'text-secondary-emphasis' },
};