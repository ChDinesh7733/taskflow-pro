import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileSpreadsheet, Upload, Download, Trash2, Search,
  RefreshCw, HardDrive, Filter, CheckCircle2, ArrowUpDown
} from 'lucide-react';
import taskApi from '../../api/taskApi';
import toast from 'react-hot-toast';
import styles from './UploadedFilesSection.module.css';

export default function UploadedFilesSection({ onUploadCsv, onUploadPdf }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'CSV' | 'PDF'
  const [deletingId, setDeletingId] = useState(null);

  const csvInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await taskApi.getUploadedFiles();
      setFiles(data || []);
    } catch (err) {
      toast.error('Failed to load stored files: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Format bytes
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = async (file) => {
    const toastId = toast.loading(`Downloading ${file.originalFilename}...`);
    try {
      await taskApi.downloadUploadedFile(file.id, file.originalFilename);
      toast.success(`Downloaded ${file.originalFilename}`, { id: toastId });
    } catch (err) {
      toast.error('Download failed: ' + err.message, { id: toastId });
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.originalFilename}" from backend storage?`)) {
      return;
    }
    setDeletingId(file.id);
    const toastId = toast.loading(`Deleting ${file.originalFilename}...`);
    try {
      await taskApi.deleteUploadedFile(file.id);
      toast.success(`File "${file.originalFilename}" removed from backend`, { id: toastId });
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (err) {
      toast.error('Delete failed: ' + err.message, { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  const onCsvSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading(`Uploading "${file.name}" to backend store...`);
    try {
      const res = await taskApi.uploadCsv(file);
      toast.success(res.message || `CSV "${file.name}" uploaded successfully! 🎉`, { id: toastId, duration: 4000 });
      fetchFiles();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to upload CSV', { id: toastId });
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const onPdfSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading(`Uploading "${file.name}" to backend store...`);
    try {
      const res = await taskApi.uploadPdf(file);
      toast.success(res.message || `PDF "${file.name}" uploaded successfully! 📄`, { id: toastId, duration: 4000 });
      fetchFiles();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to upload PDF', { id: toastId });
    } finally {
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // Filter files
  const filteredFiles = files.filter(f => {
    const matchesSearch = !search || f.originalFilename?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || f.fileType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Calculate statistics
  const totalSize = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);
  const csvCount = files.filter(f => f.fileType === 'CSV').length;
  const pdfCount = files.filter(f => f.fileType === 'PDF').length;

  return (
    <div className={styles.container}>
      {/* Hidden file inputs for uploading directly from this section */}
      <input
        type="file"
        ref={csvInputRef}
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={onCsvSelected}
      />
      <input
        type="file"
        ref={pdfInputRef}
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={onPdfSelected}
      />

      {/* Section Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Backend File Storage</h2>
          <p className={styles.subtitle}>
            Manage and view all CSV spreadsheets and PDF documents uploaded and stored on the server.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.uploadBtnCsv}
            onClick={() => csvInputRef.current?.click()}
            title="Open File Explorer to upload and store a CSV file"
          >
            <Upload size={14} />
            <span>Upload CSV</span>
          </button>
          <button
            className={styles.uploadBtnPdf}
            onClick={() => pdfInputRef.current?.click()}
            title="Open File Explorer to upload and store a PDF document"
          >
            <Upload size={14} />
            <span>Upload PDF</span>
          </button>
          <button
            className={styles.refreshBtn}
            onClick={fetchFiles}
            title="Refresh files list"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <HardDrive size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Files Stored</p>
            <h3 className={styles.statValue}>{files.length}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#ecfdf5', color: '#059669' }}>
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>CSV Datasets</p>
            <h3 className={styles.statValue}>{csvCount}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#fff1f2', color: '#e11d48' }}>
            <FileText size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>PDF Documents</p>
            <h3 className={styles.statValue}>{pdfCount}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#f8fafc', color: '#64748b' }}>
            <HardDrive size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Storage Used</p>
            <h3 className={styles.statValue}>{formatBytes(totalSize)}</h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search uploaded files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.pillGroup}>
          <button
            className={`${styles.pill} ${typeFilter === 'ALL' ? styles.pillActive : ''}`}
            onClick={() => setTypeFilter('ALL')}
          >
            All Files ({files.length})
          </button>
          <button
            className={`${styles.pill} ${typeFilter === 'CSV' ? styles.pillActive : ''}`}
            onClick={() => setTypeFilter('CSV')}
          >
            CSV Files ({csvCount})
          </button>
          <button
            className={`${styles.pill} ${typeFilter === 'PDF' ? styles.pillActive : ''}`}
            onClick={() => setTypeFilter('PDF')}
          >
            PDF Files ({pdfCount})
          </button>
        </div>
      </div>

      {/* Files Table / List */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingState}>
            <RefreshCw size={24} className={styles.spin} style={{ color: '#4f46e5' }} />
            <p>Loading files from backend store…</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <HardDrive size={32} color="#94a3b8" />
            </div>
            <h4>{search || typeFilter !== 'ALL' ? 'No matching files found' : 'No files uploaded yet'}</h4>
            <p>
              {search || typeFilter !== 'ALL'
                ? 'Try adjusting your search query or filter.'
                : 'Upload your first CSV spreadsheet or PDF document to store it on the server.'}
            </p>
            {!search && typeFilter === 'ALL' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className={styles.uploadBtnCsv} onClick={() => csvInputRef.current?.click()}>
                  <Upload size={14} /> Upload CSV
                </button>
                <button className={styles.uploadBtnPdf} onClick={() => pdfInputRef.current?.click()}>
                  <Upload size={14} /> Upload PDF
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>File Size</th>
                  <th>Uploaded At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map(file => (
                  <tr key={file.id}>
                    <td>
                      <div className={styles.fileCell}>
                        <div
                          className={styles.fileIcon}
                          style={{
                            background: file.fileType === 'CSV' ? '#ecfdf5' : '#fff1f2',
                            color: file.fileType === 'CSV' ? '#059669' : '#e11d48'
                          }}
                        >
                          {file.fileType === 'CSV' ? <FileSpreadsheet size={16} /> : <FileText size={16} />}
                        </div>
                        <div>
                          <p className={styles.fileName}>{file.originalFilename}</p>
                          <p className={styles.fileId}>ID: {file.id.substring(0, 18)}…</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={styles.typeBadge}
                        style={{
                          background: file.fileType === 'CSV' ? '#dcfce7' : '#fee2e2',
                          color: file.fileType === 'CSV' ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {file.fileType}
                      </span>
                    </td>
                    <td className={styles.textMuted}>{formatBytes(file.fileSize)}</td>
                    <td className={styles.textMuted}>{file.createdAt || 'Just now'}</td>
                    <td>
                      <div className={styles.actionCell}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleDownload(file)}
                          title="Download file from backend"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          onClick={() => handleDelete(file)}
                          disabled={deletingId === file.id}
                          title="Delete file from backend store"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
