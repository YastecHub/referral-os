import React from 'react';
import {
    ChevronDown,
    CircleCheck,
    Clock3
} from 'lucide-react';


export function PageIntro({
    eyebrow,
    title,
    subtitle,
    action
}) {
    return (
        <div className="page-intro">
            <div>
                {eyebrow && (
                    <span className="eyebrow">
                        {eyebrow}
                    </span>
                )}

                <h1>{title}</h1>

                {subtitle && (
                    <p>{subtitle}</p>
                )}
            </div>

            {action}
        </div>
    );
}


export function StatCard({
    value,
    label,
    tone = ''
}) {
    return (
        <div className={`stat-card ${tone}`}>
            <strong>{value}</strong>
            <span>{label}</span>
        </div>
    );
}


export function StatusBadge({
    status
}) {
    const danger = [
        'Emergency',
        'Urgent'
    ].includes(status);

    const success = [
        'Accepted',
        'Care Confirmed',
        'Feedback Sent',
        'Available'
    ].includes(status);

    return (
        <span
            className={`status-badge ${
                danger ? 'danger' : ''
            } ${
                success ? 'success' : ''
            }`}
        >
            {status}
        </span>
    );
}


export function CapabilitySelect({
    value = [],
    onChange,
    options
}) {
    const toggle = (option) => {
        onChange(
            value.includes(option)
                ? value.filter(
                    (item) => item !== option
                )
                : [...value, option]
        );
    };

    return (
        <div className="capability-select">
            <div className="capability-control">
                <span>
                    {value.length
                        ? `${value.length} selected`
                        : 'Select capabilities'}
                </span>

                
            </div>

            <div className="capability-options">
                {options.map((option) => (
                    <label
                        className="capability-option"
                        key={option}
                    >
                        <input
                            type="checkbox"
                            checked={value.includes(option)}
                            onChange={() => toggle(option)}
                        />

                        <span>{option}</span>
                    </label>
                ))}
            </div>

            {value.length > 0 && (
                <div className="chip-list">
                    {value.map((option) => (
                        <span
                            className="chip"
                            key={option}
                        >
                            {option}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}


export function ReferralCard({
    referral,
    facilityName,
    action
}) {
    return (
        <article
            className={`referral-card ${
                referral.urgency === 'Emergency'
                    ? 'urgent-card'
                    : ''
            }`}
        >
            <div className="referral-card-top">
                <div>
                    <span className="referral-id">
                        {referral.id}
                    </span>

                    <h3>
                        {referral.patientReference}
                    </h3>
                </div>

                <StatusBadge
                    status={referral.urgency}
                />
            </div>

            <div className="referral-meta-grid">
                <div>
                    <span>Facility</span>
                    <strong>{facilityName}</strong>
                </div>

                <div>
                    <span>Status</span>
                    <strong>{referral.status}</strong>
                </div>

                <div>
                    <span>Requirements</span>
                    <strong>
                        {referral.requirements.join(' • ')}
                    </strong>
                </div>

                <div>
                    <span>Patient</span>
                    <strong>
                        {referral.age} • {referral.sex}
                    </strong>
                </div>
            </div>

            <p className="referral-notes">
                {referral.notes}
            </p>

            {action && (
                <div className="referral-actions">
                    {action}
                </div>
            )}
        </article>
    );
}


export function ReadinessRow({
    label,
    available
}) {
    return (
        <div className="readiness-row">
            <div>
                <strong>{label}</strong>

                <span>
                    {available
                        ? 'Available'
                        : 'Unavailable'}
                </span>
            </div>
        </div>
    );
}


export function ReferralTimeline({
    currentStatus
}) {
    const statuses = [
        'Created',
        'Facility Identified',
        'Accepted',
        'Transport Requested',
        'In Transit',
        'Arrived',
        'Care Confirmed',
        'Feedback Sent'
    ];

    const activeIndex = statuses.indexOf(
        currentStatus
    );

    return (
        <div className="timeline">
            {statuses.map((status, index) => {
                const isComplete =
                    index <= activeIndex;

                return (
                    <div
                        className={`timeline-step ${
                            isComplete
                                ? 'complete'
                                : ''
                        }`}
                        key={status}
                    >
                        <div className="timeline-dot">
                            {index < activeIndex && (
                                <CircleCheck size={13} />
                            )}

                            {index === activeIndex && (
                                <Clock3 size={13} />
                            )}
                        </div>

                        <span>{status}</span>
                    </div>
                );
            })}
        </div>
    );
}