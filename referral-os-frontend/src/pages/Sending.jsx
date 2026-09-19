import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    ArrowRight,
    Check,
    Mic,
    MicOff,
    Hospital,
    Loader2
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
    const [submitting, setSubmitting] = useState(false);
    const [ai, setAi] = useState(null);
    const [created, setCreated] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [voiceLang, setVoiceLang] = useState('en');
    const [isRecording, setIsRecording] = useState(false);
    const [voiceLoading, setVoiceLoading] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const updateForm = (key, value) => {
        setForm((current) => ({
            ...current,
            [key]: value
        }));
    };

    // Live pre-submission match preview whenever capabilities or urgency change
    useEffect(() => {
        if (form.requirements.length > 0) {
            api.referrals
                .getMatchCandidates({
                    urgency: form.urgency,
                    requirements: form.requirements,
                    sendingFacilityId: user?.facilityId || 'mushin-phc'
                })
                .then(setCandidates);
        } else {
            setCandidates([]);
        }
    }, [form.requirements, form.urgency, user?.facilityId]);

    // AI Smart Intake Note Structuring
    const structure = async () => {
        if (!note.trim()) return;
        setLoading(true);
        try {
            const result = await api.referrals.structureWithAI(note);
            setAi(result);
            setForm((current) => ({
                ...current,
                patientReference: result.patientReference || current.patientReference,
                age: result.age || current.age,
                sex: result.sex || current.sex,
                urgency: result.urgency || current.urgency,
                requirements: result.requirements?.length ? result.requirements : current.requirements,
                notes: result.notes || current.notes
            }));
        } finally {
            setLoading(false);
        }
    };

    // Hands-Free Nigerian Voice Intake (Speech-to-Referral)
    const toggleVoiceRecording = async () => {
        if (isRecording) {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunksRef.current = [];
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunksRef.current.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach((track) => track.stop());
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    setVoiceLoading(true);
                    try {
                        const response = await api.voice.speechToReferral(audioBlob, voiceLang);
                        if (response?.transcript) {
                            setNote(response.transcript);
                        }
                        if (response?.structuredReferral) {
                            const sr = response.structuredReferral;
                            const structured = {
                                patientReference: sr.patientName || 'Voice Case',
                                age: sr.patientAge || 28,
                                sex: sr.patientGender || 'Female',
                                urgency: sr.urgencyTier === 'CRITICAL' ? 'Emergency' : sr.urgencyTier === 'HIGH' ? 'Urgent' : 'Routine',
                                requirements: Array.isArray(sr.requiredCapabilities) && sr.requiredCapabilities.length > 0
                                    ? sr.requiredCapabilities
                                    : [sr.requiredCapability || 'Emergency obstetric'],
                                notes: sr.clinicalFindings || response.transcript
                            };
                            setAi(structured);
                            setForm((prev) => ({ ...prev, ...structured }));
                        }
                    } catch (err) {
                        console.warn('Voice intake fallback:', err.message);
                    } finally {
                        setVoiceLoading(false);
                    }
                };

                mediaRecorderRef.current = mediaRecorder;
                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                alert('Microphone access unavailable. Please grant microphone permission to use hands-free voice intake.');
            }
        }
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
        setSubmitting(true);

        const topCandidate = candidates[0];
        try {
            const referral = await api.referrals.create({
                ...form,
                age: Number(form.age),
                sendingFacilityId: user?.facilityId || 'mushin-phc',
                receivingFacilityId: topCandidate?.facilityId || 'lagos-general'
            });

            setCreated(referral);
            setForm(blank);
            setNote('');
            setAi(null);
        } finally {
            setSubmitting(false);
        }
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
                        <strong>{created.id} created.</strong> Your referral is now being coordinated.
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

                    {/* Pre-Submission Match Preview */}
                    {candidates.length > 0 && (
                        <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            padding: '0.85rem 1.1rem',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Hospital size={20} color="#15803d" />
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Top Matched Receiving Facility
                                    </span>
                                    <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                                        {candidates[0].facilityName}
                                    </div>
                                    <small style={{ color: '#15803d' }}>
                                        {candidates[0].reason} • {candidates[0].distance} km away
                                    </small>
                                </div>
                            </div>
                            <span style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                fontWeight: 800,
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem'
                            }}>
                                {candidates[0].score}% Match
                            </span>
                        </div>
                    )}

                    <div className="form-action">
                        <span className={complete ? 'valid' : ''}>
                            {complete
                                ? '✓ All required fields complete'
                                : 'Complete all required fields'}
                        </span>

                        <button
                            className="button primary"
                            disabled={!complete || submitting}
                        >
                            {submitting ? 'Sending...' : 'Send referral'}
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </form>

                <aside className="panel ai-intake">
                    <div className="ai-heading">
                        <Sparkles size={20} />
                        <div>
                            <h2>Smart Intake AI</h2>
                            <p>
                                Voice dictation or messy notes to structured referral.
                            </p>
                        </div>
                    </div>

                    {/* Nigerian Multilingual Voice Dictation */}
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        marginBottom: '0.75rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                                🎙️ VOICE INTAKE (NIGERIAN LANGUAGES)
                            </span>
                            <select
                                value={voiceLang}
                                onChange={(e) => setVoiceLang(e.target.value)}
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="en">English (Nigeria)</option>
                                <option value="yo">Yorùbá</option>
                                <option value="ha">Hausa</option>
                                <option value="ig">Igbo</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            className={`button full ${isRecording ? 'danger' : 'secondary'}`}
                            onClick={toggleVoiceRecording}
                            disabled={voiceLoading}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            {voiceLoading ? (
                                <>
                                    <Loader2 size={16} className="spin" /> Processing Voice Intake...
                                </>
                            ) : isRecording ? (
                                <>
                                    <MicOff size={16} color="#dc2626" /> Stop Recording (Processing...)
                                </>
                            ) : (
                                <>
                                    <Mic size={16} /> Record Case Voice Note
                                </>
                            )}
                        </button>
                    </div>

                    <Field label="MESSY CLINICAL NOTES">
                        <textarea
                            value={note}
                            onChange={(event) =>
                                setNote(event.target.value)
                            }
                            placeholder="Paste a quick clinical note or speak in English, Yorùbá, Hausa, or Igbo..."
                        />
                    </Field>

                    <button
                        className="button accent full"
                        type="button"
                        disabled={!note.trim() || loading}
                        onClick={structure}
                    >
                        {loading ? 'Structuring with Groq AI...' : 'Structure with AI'}
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
                                        {Array.isArray(ai.requirements) ? ai.requirements.join(', ') : ai.requirements}
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
                                Your structured referral will appear here for review before sending.
                            </p>
                        )}
                    </div>

                    <div className="ai-note">
                        AI assists routing decisions; clinicians remain in control.
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