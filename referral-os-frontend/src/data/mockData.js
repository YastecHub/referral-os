export const capabilities=['Emergency obstetric','Blood transfusion','Theater','Maternal ICU','NICU','PICU','Pediatric emergency','Obstetric specialist','Surgery','Burns & trauma'];
export const facilities=[
{id:'mushin-phc',name:'Mushin Primary Health Centre',shortName:'Mushin PHC',type:'Tier 1 PHC',acceptingReferrals:true,readiness:{blood:false,theater:false,specialist:false,percentage:68},location:{lat:6.533,lng:3.352}},
{id:'surulere-phc',name:'Surulere Primary Health Centre',shortName:'Surulere PHC',type:'Tier 1 PHC',acceptingReferrals:true,readiness:{blood:false,theater:false,specialist:false,percentage:72},location:{lat:6.496,lng:3.352}},
{id:'ebute-metta-chc',name:'Ebute Metta Comprehensive Health Centre',shortName:'Ebute Metta CHC',type:'Tier 2 CHC',acceptingReferrals:true,readiness:{blood:true,theater:true,specialist:true,percentage:94},location:{lat:6.488,lng:3.377}},
{id:'lagos-general',name:'Lagos General Hospital',shortName:'Lagos General',type:'Tertiary Hospital',acceptingReferrals:true,readiness:{blood:true,theater:true,specialist:true,percentage:97},location:{lat:6.453,lng:3.395}}
];
export const currentUser={id:'user-001',name:'Dr. Amina Yusuf',profession:'Doctor',facilityId:'mushin-phc',facilityName:'Mushin Primary Health Centre',role:'Healthcare Worker'};
export const referrals = [
    {
        id: 'REF-0248',
        sendingFacilityId: 'mushin-phc',
        receivingFacilityId: 'lagos-general',
        patientReference: 'Aisha Ibrahim',
        age: 29,
        sex: 'Female',
        urgency: 'Urgent',
        requirements: [
            'Emergency obstetric',
            'Blood transfusion'
        ],
        notes: 'Postpartum patient with suspected complications; needs urgent review.',
        status: 'Created',
        createdAt: '2026-09-18T09:34:00.000Z'
    },

    {
        id: 'REF-0247',
        sendingFacilityId: 'surulere-phc',
        receivingFacilityId: 'ebute-metta-chc',
        patientReference: 'Zainab Musa',
        age: 34,
        sex: 'Female',
        urgency: 'Urgent',
        requirements: [
            'Blood transfusion'
        ],
        notes: 'Clinical review and blood support requested.',
        status: 'Accepted',
        createdAt: '2026-09-18T08:55:00.000Z'
    },

    {
        id: 'REF-0245',
        sendingFacilityId: 'mushin-phc',
        receivingFacilityId: 'lagos-general',
        patientReference: 'Fatima Bello',
        age: 41,
        sex: 'Female',
        urgency: 'Routine',
        requirements: [
            'Obstetric specialist'
        ],
        notes: 'Specialist review requested.',
        status: 'In Transit',
        createdAt: '2026-09-17T16:10:00.000Z'
    },

    {
        id: 'REF-1042',
        sendingFacilityId: 'mushin-phc',
        receivingFacilityId: 'ebute-metta-chc',
        patientReference: 'Synthetic Case 1042',
        age: 27,
        sex: 'Female',
        urgency: 'Emergency',
        requirements: [
            'Emergency obstetric',
            'Theater'
        ],
        notes: 'Urgent specialist review.',
        status: 'Created',
        createdAt: '2026-09-18T09:42:00.000Z'
    },

    // Receiving queue for Mushin PHC
    {
        id: 'REF-1043',
        sendingFacilityId: 'surulere-phc',
        receivingFacilityId: 'mushin-phc',
        patientReference: 'Hauwa Sani',
        age: 32,
        sex: 'Female',
        urgency: 'Emergency',
        requirements: [
            'Emergency obstetric',
            'Obstetric specialist'
        ],
        notes: 'Patient requires urgent obstetric assessment and specialist review.',
        status: 'Created',
        createdAt: '2026-09-19T08:15:00.000Z'
    },

    {
        id: 'REF-1044',
        sendingFacilityId: 'ebute-metta-chc',
        receivingFacilityId: 'mushin-phc',
        patientReference: 'Maryam Lawal',
        age: 26,
        sex: 'Female',
        urgency: 'Urgent',
        requirements: [
            'Blood transfusion'
        ],
        notes: 'Blood support requested following clinical assessment.',
        status: 'Created',
        createdAt: '2026-09-19T08:42:00.000Z'
    },

    {
        id: 'REF-1045',
        sendingFacilityId: 'surulere-phc',
        receivingFacilityId: 'mushin-phc',
        patientReference: 'Khadijah Bello',
        age: 38,
        sex: 'Female',
        urgency: 'Urgent',
        requirements: [
            'Emergency obstetric',
            'Theater'
        ],
        notes: 'Requires urgent assessment and possible theatre support.',
        status: 'Accepted',
        createdAt: '2026-09-19T07:55:00.000Z'
    },

    {
        id: 'REF-1046',
        sendingFacilityId: 'ebute-metta-chc',
        receivingFacilityId: 'mushin-phc',
        patientReference: 'Amina Yusuf',
        age: 30,
        sex: 'Female',
        urgency: 'Routine',
        requirements: [
            'Obstetric specialist'
        ],
        notes: 'Specialist consultation requested.',
        status: 'Accepted',
        createdAt: '2026-09-18T15:20:00.000Z'
    },

    {
        id: 'REF-1047',
        sendingFacilityId: 'surulere-phc',
        receivingFacilityId: 'mushin-phc',
        patientReference: 'Safiya Ahmed',
        age: 24,
        sex: 'Female',
        urgency: 'Routine',
        requirements: [
            'Pediatric emergency'
        ],
        notes: 'Requires further clinical assessment and pediatric support.',
        status: 'Care Confirmed',
        createdAt: '2026-09-18T11:35:00.000Z'
    }
];
export const networkSnapshot={facilitiesOnline:4,activeReferrals:8,urgentReferrals:3,awaitingResponse:3,acceptedToday:7,careConfirmed:12,inTransit:5};
export const statusStages=['Created','Facility Identified','Accepted','Transport Requested','In Transit','Arrived','Care Confirmed','Feedback Sent'];
