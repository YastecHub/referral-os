import React, { useEffect, useState } from 'react';
import {
    Activity,
    Building2,
    MapPin,
    Radio
} from 'lucide-react';
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer
} from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import { api } from '../services/api';
import {
    PageIntro,
    StatCard,
    StatusBadge
} from '../components/UI';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';


L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow
});


export default function Admin() {
    const [snapshot, setSnapshot] = useState(null);
    const [facilities, setFacilities] = useState([]);

    useEffect(() => {
        api.facilities.networkSummary().then(setSnapshot);
        api.facilities.list().then(setFacilities);
    }, []);

    return (
        <div>
            <PageIntro
                eyebrow="ADMIN • NETWORK MONITORING"
                title="Network Command Centre"
                subtitle="Monitor facilities, readiness and referrals across the ReferralOS network."
                action={
                    <span className="live-indicator">
                        <Radio size={14} />
                        LIVE NETWORK
                    </span>
                }
            />

            <div className="stats-grid command-stats">
                <StatCard
                    value={snapshot?.facilitiesOnline ?? '—'}
                    label="Facilities online"
                />

                <StatCard
                    value={snapshot?.activeReferrals ?? '—'}
                    label="Active referrals"
                />

                <StatCard
                    value={snapshot?.urgentReferrals ?? '—'}
                    label="Urgent referrals"
                    tone="danger"
                />

                <StatCard
                    value={snapshot?.awaitingResponse ?? '—'}
                    label="Awaiting response"
                    tone="warning"
                />
            </div>

            <div className="command-layout">
                <section className="panel facility-network">
                    <div className="section-heading">
                        <div>
                            <h2>Facility network</h2>
                            <p>
                                Current routing capacity across participating
                                facilities.
                            </p>
                        </div>
                    </div>

                    <div className="facility-table">
                        <div className="table-head">
                            <span>Facility</span>
                            <span>Status</span>
                            <span>Readiness</span>
                            <span>Type</span>
                        </div>

                        {facilities.map((facility) => (
                            <div
                                className="facility-row"
                                key={facility.id}
                            >
                                <div className="facility-name">
                                    <Building2 size={18} />

                                    <div>
                                        <strong>
                                            {facility.name}
                                        </strong>

                                        <span>
                                            {facility.type}
                                        </span>
                                    </div>
                                </div>

                                <StatusBadge
                                    status={
                                        facility.acceptingReferrals
                                            ? 'Available'
                                            : 'Unavailable'
                                    }
                                />

                       <div className="readiness-meter">
    <div className="readiness-track">
        <span
            style={{
                width: `${facility.readiness.percentage}%`
            }}
        />
    </div>

    <b>
        {facility.readiness.percentage}%
    </b>
</div>

                                <span className="desktop-only">
                                    {facility.type}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className="panel map-panel">
                    <div className="map-heading">
                        <h2>Network map</h2>

                        <p>
                            <MapPin size={14} />
                            Lagos facility locations
                        </p>
                    </div>

                    <div className="network-map">
                        <MapContainer
                            center={[6.495, 3.37]}
                            zoom={12}
                            scrollWheelZoom={false}
                            className="leaflet-map"
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {facilities.map((facility) => (
                                <Marker
                                    key={facility.id}
                                    position={[
                                        facility.location.lat,
                                        facility.location.lng
                                    ]}
                                >
                                    <Popup>
                                        <div className="map-popup">
                                            <strong>
                                                {facility.name}
                                            </strong>

                                            <span>
                                                {facility.type}
                                            </span>

                                            <div>
                                                <b>Status:</b>{' '}
                                                {facility.acceptingReferrals
                                                    ? 'Available'
                                                    : 'Unavailable'}
                                            </div>

                                            <div>
                                                <b>Readiness:</b>{' '}
                                                {
                                                    facility.readiness
                                                        .percentage
                                                }
                                                %
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </aside>
            </div>

            <section className="panel operational-insights">
                <div className="insight-header">
                    <div>
                        <Activity size={18} />

                        <div>
                            <h2>AI operational insights</h2>

                            <p>
                                Decision support for network monitoring.
                            </p>
                        </div>
                    </div>

                    <span className="insight-note">
                        AI assists routing decisions; clinicians remain in
                        control.
                    </span>
                </div>

                <div className="insight-grid">
                    <div>
                        <strong>
                            {snapshot?.careConfirmed ?? '—'}
                        </strong>

                        <span>
                            Care confirmed
                        </span>
                    </div>

                    <div>
                        <strong>
                            {snapshot?.inTransit ?? '—'}
                        </strong>

                        <span>
                            In transit
                        </span>
                    </div>

                    <div>
                        <strong>
                            {snapshot?.activeReferrals ?? '—'}
                        </strong>

                        <span>
                            Active referrals
                        </span>
                    </div>
                </div>
            </section>
        </div>
    );
}