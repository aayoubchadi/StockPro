import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession } from '../lib/authStore';
import {
  createCompanyEmployee,
  getCompanyContext,
  getCompanyEmployees,
  updateCompanyEmployee,
  updateCompanyEmployeeStatus,
} from '../services/companyApi';
import { PERMISSION_KEYS } from '../lib/permissions';

function titleizePermission(permission) {
  return permission
    .split('.')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

export default function TeamAccessPage() {
  const [session] = useState(() => getSession());
  const [context, setContext] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [editPermissions, setEditPermissions] = useState({});
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    presetKey: '',
    permissions: {},
  });

  const accessToken = session?.accessToken;

  const loadData = async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);

    try {
      const [contextData, employeeData] = await Promise.all([
        getCompanyContext({ accessToken }),
        getCompanyEmployees({ accessToken }),
      ]);

      setContext(contextData);
      setEmployees(employeeData?.employees || []);
      setMessage('');
      setMessageType('');
    } catch (error) {
      setMessage(error.message || 'Unable to load team data.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  const capacityLabel = useMemo(() => {
    const active = context?.capacity?.activeEmployees || 0;
    const max = context?.capacity?.maxEmployees || 0;
    return `${active} / ${max}`;
  }, [context]);

  const handleCreateEmployee = async (event) => {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setMessageType('');

    try {
      await createCompanyEmployee({
        accessToken,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        presetKey: form.presetKey || undefined,
        permissions: form.permissions,
      });

      setForm({
        fullName: '',
        email: '',
        password: '',
        presetKey: '',
        permissions: {},
      });

      setMessage('Employee created successfully.');
      setMessageType('success');
      await loadData();
    } catch (error) {
      setMessage(error.message || 'Unable to create employee.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEmployeeStatus = async (employee) => {
    if (!accessToken) {
      return;
    }

    try {
      await updateCompanyEmployeeStatus({
        accessToken,
        employeeId: employee.id,
        isActive: !employee.isActive,
      });
      await loadData();
    } catch (error) {
      setMessage(error.message || 'Unable to update employee status.');
      setMessageType('error');
    }
  };

  const startEditEmployee = (employee) => {
    setSelectedEmployeeId(employee.id);
    const permissionMap = {};
    PERMISSION_KEYS.forEach((permission) => {
      permissionMap[permission] = Boolean(employee.permissions?.[permission]);
    });
    setEditPermissions(permissionMap);
  };

  const handleUpdateEmployeePermissions = async () => {
    if (!accessToken || !selectedEmployeeId) {
      return;
    }

    setIsUpdating(true);
    setMessage('');
    setMessageType('');

    try {
      await updateCompanyEmployee({
        accessToken,
        employeeId: selectedEmployeeId,
        permissions: editPermissions,
      });

      setMessage('Employee privileges updated.');
      setMessageType('success');
      await loadData();
    } catch (error) {
      setMessage(error.message || 'Unable to update employee privileges.');
      setMessageType('error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell dashboard-page">
        <section className="dashboard-head">
          <p className="eyebrow">Team & Access</p>
          <h1>Manage employee accounts and privileges</h1>
          <p>Employee capacity: <strong>{capacityLabel}</strong></p>
        </section>

        {isLoading ? <p className="dashboard-state">Loading team data...</p> : null}
        {!isLoading && message ? <p className={`form-message ${messageType}`}>{message}</p> : null}

        {!isLoading ? (
          <section className="dashboard-grid dashboard-grid-split">
            <article className="dashboard-box dashboard-list-box">
              <h3>Create employee</h3>
              <form className="checkout-form" onSubmit={handleCreateEmployee}>
                <label>
                  Full name
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Preset (optional)
                  <select
                    value={form.presetKey}
                    onChange={(event) => setForm((current) => ({ ...current, presetKey: event.target.value }))}
                  >
                    <option value="">Custom only</option>
                    {(context?.permissionPresets || []).map((preset) => (
                      <option key={preset.key} value={preset.key}>{preset.label}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <p className="checkout-policy-note">Custom privileges</p>
                  <div className="lp-plan-list">
                    {PERMISSION_KEYS.map((permission) => (
                      <label key={permission} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(form.permissions[permission])}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              permissions: {
                                ...current.permissions,
                                [permission]: event.target.checked,
                              },
                            }))
                          }
                        />
                        <span>{titleizePermission(permission)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create employee'}
                </button>
              </form>
            </article>

            <article className="dashboard-box dashboard-list-box">
              <h3>Employees</h3>
              <ul className="dashboard-list">
                {employees.map((employee) => (
                  <li key={employee.id}>
                    <strong>{employee.fullName} ({employee.email})</strong>
                    <span>
                      {employee.permissionList.join(', ') || 'No privileges'} | {employee.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => startEditEmployee(employee)}
                      >
                        Edit privileges
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => toggleEmployeeStatus(employee)}
                      >
                        {employee.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {selectedEmployeeId ? (
                <div style={{ marginTop: '18px' }}>
                  <h3>Update privileges</h3>
                  <div className="lp-plan-list">
                    {PERMISSION_KEYS.map((permission) => (
                      <label key={permission} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(editPermissions[permission])}
                          onChange={(event) =>
                            setEditPermissions((current) => ({
                              ...current,
                              [permission]: event.target.checked,
                            }))
                          }
                        />
                        <span>{titleizePermission(permission)}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleUpdateEmployeePermissions}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Save privileges'}
                  </button>
                </div>
              ) : null}
            </article>
          </section>
        ) : null}
      </main>
    </>
  );
}
