import { useState } from 'react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession } from '../lib/authStore';
import {
  exportCompanyProductsCsv,
  importCompanyProductsCsv,
} from '../services/companyApi';

export default function DataExchangePage() {
  const [session] = useState(() => getSession());
  const [csvText, setCsvText] = useState('');
  const [summary, setSummary] = useState(null);
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accessToken = session?.accessToken;

  const handleExportCsv = async () => {
    if (!accessToken) {
      return;
    }

    try {
      const csv = await exportCompanyProductsCsv({ accessToken });
      setCsvText(csv);
      setMessage('CSV exported. Copy from the text area.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'CSV export failed.');
      setMessageType('error');
    }
  };

  const handleImportCsv = async (event) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setSummary(null);
    setErrors([]);

    try {
      const data = await importCompanyProductsCsv({
        accessToken,
        csvText,
      });

      setSummary(data?.summary || null);
      setErrors(data?.errors || []);
      setMessage('Import completed.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'CSV import failed.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell dashboard-page">
        <section className="dashboard-head">
          <p className="eyebrow">Data Exchange</p>
          <h1>Export and import inventory data in CSV</h1>
        </section>

        {message ? <p className={`form-message ${messageType}`}>{message}</p> : null}

        <section className="dashboard-grid dashboard-grid-split">
          <article className="dashboard-box dashboard-list-box">
            <h3>Export</h3>
            <p>Export all company products as CSV.</p>
            <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
              Export products CSV
            </button>
          </article>

          <article className="dashboard-box dashboard-list-box">
            <h3>Import</h3>
            <form className="checkout-form" onSubmit={handleImportCsv}>
              <label>
                CSV text
                <textarea
                  rows={12}
                  value={csvText}
                  onChange={(event) => setCsvText(event.target.value)}
                  placeholder="sku,name,description,unitPrice,quantityInStock,lowStockThreshold,isActive"
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Importing...' : 'Import CSV'}
              </button>
            </form>
          </article>
        </section>

        {summary ? (
          <section className="dashboard-box dashboard-list-box">
            <h3>Import summary</h3>
            <ul className="dashboard-list">
              <li><strong>Total rows</strong><span>{summary.totalRows}</span></li>
              <li><strong>Successful rows</strong><span>{summary.successfulRows}</span></li>
              <li><strong>Failed rows</strong><span>{summary.failedRows}</span></li>
              <li><strong>Created</strong><span>{summary.createdCount}</span></li>
              <li><strong>Updated</strong><span>{summary.updatedCount}</span></li>
            </ul>
          </section>
        ) : null}

        {errors.length > 0 ? (
          <section className="dashboard-box dashboard-list-box">
            <h3>Row validation errors</h3>
            <ul className="dashboard-list">
              {errors.map((error) => (
                <li key={`${error.lineNumber}-${error.message}`}>
                  <strong>Line {error.lineNumber}</strong>
                  <span>{error.message}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
