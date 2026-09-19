import React, { useMemo, useState } from 'react';
import {
    Sparkles,
    ArrowRight,
    Check
} from 'lucide-react';

import { api } from '../services/api';
import { capabilities } from '../data/mockData';
import {
    CapabilitySelect,
    PageIntro,
    StatusBadge
} from '../components/UI';

const blank = {
    patientReference: '',
    age: '',
    sex: '',
    urgency: 'Urgent',
    requirements: [],
    notes: ''
};

export default function Sending({ user }) {
    const [form, setForm] = useState(blank);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [ai, setAi] = useState(null);
    const [created, setCreated] = useState(null);

    const updateForm = (key, value) => {
        setForm((current) => ({
            ...current,
            [key]: value
        }));
    };

    const structure = async () => {
        setLoading(true);

        const result = await api.referrals.structureWithAI(note);

        setAi(result);

        setForm((current) => ({
            ...current,
            ...result
        }));

        setLoading(false);
    };

    const complete = useMemo(
        () =>
            Boolean(
                form.patientReference &&
                form.age &&
                form.sex &&
                form.requirements.length &&
                form.notes
            ),
        [form]
    );

    const submit = async (event) => {
        event.preventDefault();

        const referral = await api.referrals.create({
            ...form,
            age: Number(form.age),
            sendingFacilityId: user.facilityId,
            receivingFacilityId: 'lagos-general'
        });

        setCreated(referral);
        setForm(blank);
    };

    return (
        <div>
            <PageIntro
                eyebrow="PHC SENDING"
                title="Create a new referral"
                subtitle="Send a complete, structured referral to the most appropriate receiving facility."
            />

            {created && (
                <div className="success-banner">
                    <Check size={18} />

                    <div>
                        <strong>{created.id} created.</strong>
                        Your referral is now being coordinated.
                    </div>

                    <StatusBadge status={created.status} />
                </div>
            )}

            <div className="sending-layout">
                <form
                    className="panel referral-form"
                    onSubmit={submit}
                >
                    <h2>Referral details</h2>

                    <Field label="PATIENT / CASE REFERENCE">
                        <input
                            required
                            value={form.patientReference}
                            placeholder="Synthetic name or case ID"
                            onChange={(event) =>
                                updateForm(
                                    'patientReference',
                                    event.target.value
                                )
                            }
                        />
                    </Field>

                    <div className="form-grid two">
                        <Field label="AGE">
                            <input
                                required
                                min="0"
                                max="120"
                                type="number"
                                value={form.age}
                                placeholder="e.g. 29"
                                onChange={(event) =>
                                    updateForm(
                                        'age',
                                        event.target.value
                                    )
                                }
                            />
                        </Field>

                        <Field label="SEX">
                            <select
                                required
                                value={form.sex}
                                onChange={(event) =>
                                    updateForm(
                                        'sex',
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">Select</option>
                                <option>Female</option>
                                <option>Male</option>
                            </select>
                        </Field>
                    </div>

                    <Field label="CLINICAL / REFERRAL NOTES">
                        <textarea
                            required
                            value={form.notes}
                            placeholder="Brief clinical information and reason for referral"
                            onChange={(event) =>
                                updateForm(
                                    'notes',
                                    event.target.value
                                )
                            }
                        />
                    </Field>

                    <div className="form-grid two">
                        <div className="field">
                            <span>REQUIRED CAPABILITIES</span>

                            <p className="field-help">
                                Select the capabilities needed for this referral.
                            </p>

                            <CapabilitySelect
                                value={form.requirements}
                                onChange={(value) =>
                                    updateForm(
                                        'requirements',
                                        value
                                    )
                                }
                                options={capabilities}
                            />
                        </div>

                        <div className="field">
                            <span>URGENCY</span>

                            <div className="urgency-options">
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="urgency"
                                        value="Emergency"
                                        checked={
                                            form.urgency === 'Emergency'
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'urgency',
                                                event.target.value
                                            )
                                        }
                                    />

                                    <span>Emergency</span>
                                </label>

                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="urgency"
                                        value="Urgent"
                                        checked={
                                            form.urgency === 'Urgent'
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'urgency',
                                                event.target.value
                                            )
                                        }
                                    />

                                    <span>Urgent</span>
                                </label>

                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="urgency"
                                        value="Routine"
                                        checked={
                                            form.urgency === 'Routine'
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'urgency',
                                                event.target.value
                                            )
                                        }
                                    />

                                    <span>Routine</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="form-action">
                        <span className={complete ? 'valid' : ''}>
                            {complete
                                ? '✓ All required fields complete'
                                : 'Complete all required fields'}
                        </span>

                        <button
                            className="button primary"
                            disabled={!complete}
                        >
                            Send referral
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </form>

                <aside className="panel ai-intake">
                    <div className="ai-heading">
                        <Sparkles size={20} />

                        <div>
                            <h2>Smart Intake</h2>
                            <p>
                                Turn messy notes into structured
                                referral information.
                            </p>
                        </div>
                    </div>

                    <Field label="MESSY NOTES">
                        <textarea
                            value={note}
                            onChange={(event) =>
                                setNote(event.target.value)
                            }
                            placeholder="Paste a quick clinical/referral note here..."
                        />
                    </Field>

                    <button
                        className="button accent full"
                        type="button"
                        disabled={!note.trim() || loading}
                        onClick={structure}
                    >
                        {loading
                            ? 'Structuring...'
                            : 'Structure with AI'}
                    </button>

                    <div className="ai-result">
                        <span>AI STRUCTURED SUMMARY</span>

                        {ai ? (
                            <div>
                                <p>
                                    Urgency:{' '}
                                    <strong>{ai.urgency}</strong>
                                </p>

                                <p>
                                    Capabilities:{' '}
                                    <strong>
                                        {ai.requirements.join(', ')}
                                    </strong>
                                </p>

                                <p>
                                    Patient reference:{' '}
                                    <strong>
                                        {ai.patientReference}
                                    </strong>
                                </p>
                            </div>
                        ) : (
                            <p>
                                Your structured referral will appear
                                here for review before sending.
                            </p>
                        )}
                    </div>

                    <div className="ai-note">
                        AI assists routing decisions; clinicians
                        remain in control.
                    </div>
                </aside>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="field">
            <span>{label}</span>
            {children}
        </label>
    );
}