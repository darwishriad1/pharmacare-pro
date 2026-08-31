import { db } from '../database/db';

export interface BackupResult {
  filename: string;
  sizeFormatted: string;
  sizeBytes: number;
  recordCount: number;
  timestamp: string;
  rawJson: string;
}

export const backupService = {
  /**
   * Get formatted JSON string of full database backup
   */
  getBackupData(): { rawJson: string; stats: any; filename: string } {
    const rawJson = db.exportFullBackup();
    const stats = db.getDatabaseStats();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `pharmacare_backup_${dateStr}.json`;
    return { rawJson, stats, filename };
  },

  /**
   * Download a full JSON backup of the database with details
   */
  downloadBackup(): BackupResult {
    const { rawJson, stats, filename } = this.getBackupData();
    const blob = new Blob([rawJson], { type: 'application/json;charset=utf-8;' });
    const sizeBytes = blob.size;
    const sizeFormatted =
      sizeBytes < 1024
        ? `${sizeBytes} B`
        : sizeBytes < 1024 * 1024
        ? `${(sizeBytes / 1024).toFixed(1)} KB`
        : `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      filename,
      sizeBytes,
      sizeFormatted,
      recordCount: stats.totalRecords,
      timestamp: new Date().toLocaleTimeString('ar-YE'),
      rawJson,
    };
  },

  /**
   * Restore database from uploaded JSON file
   */
  restoreFromFile(file: File): Promise<{ success: boolean; message: string; stats?: any }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const ok = db.importFullBackup(content);
          if (ok) {
            const stats = db.getDatabaseStats();
            resolve({
              success: true,
              message: `تم استعادة النسخة الاحتياطية بنجاح! (${stats.totalRecords} سجل)`,
              stats,
            });
          } else {
            resolve({
              success: false,
              message: 'فشل في قراءة ملف النسخة الاحتياطية. يرجى التأكد من أن الملف بصيغة JSON متوافقة.',
            });
          }
        } catch {
          resolve({
            success: false,
            message: 'حدث خطأ أثناء معالجة ملف النسخة الاحتياطية.',
          });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, message: 'تعذر قراءة الملف المحدد.' });
      };
      reader.readAsText(file);
    });
  },

  /**
   * Factory Reset database to initial demo state
   */
  resetToFactoryDefaults() {
    db.init(true);
  },
};
