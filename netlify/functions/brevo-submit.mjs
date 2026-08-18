const BREVO_API_URL = 'https://api.brevo.com/v3';
const MAX_BODY_BYTES = 100_000;

const formConfig = {
  waitlist: {
    listEnv: 'BREVO_WAITLIST_LIST_ID',
    subject: 'New Unicare waitlist request',
    tag: 'unicare-waitlist'
  },
  assessment: {
    listEnv: 'BREVO_ASSESSMENT_LIST_ID',
    subject: 'New Unicare Home Assessment',
    tag: 'unicare-assessment'
  },
  book: {
    listEnv: 'BREVO_BOOK_LIST_ID',
    subject: 'New request — The Science of Cleaning',
    tag: 'unicare-book'
  }
};

const fieldLabels = {
  name: 'Name',
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  phone: 'Phone',
  address: 'Home address',
  city: 'City',
  zip: 'ZIP code',
  service: 'Preferred service',
  message: 'Message',
  preferred_contact: 'Preferred contact method',
  home_type: 'Type of home',
  square_feet: 'Approximate square footage',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  levels: 'Number of levels',
  occupants: 'People living in the home',
  pets: 'Pets',
  last_professional_clean: 'Last professional cleaning',
  overall_condition: 'Current overall condition',
  preferred_frequency: 'Preferred service frequency',
  biggest_challenges: 'Biggest maintenance challenges',
  success_definition: 'Definition of a successful service',
  special_surfaces: 'Surfaces or belongings needing special care',
  avoid_areas: 'Rooms or items not to clean',
  fragrance_preference: 'Fragrance preference',
  product_preference: 'Product preference',
  health_details: 'Relevant allergies or sensitivities',
  product_notes: 'Product notes',
  preferred_days: 'Preferred days',
  preferred_time: 'Preferred time',
  access_notes: 'Access instructions or household routines',
  additional_notes: 'Additional notes',
  consent: 'Confirmation'
};

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function humanizeField(key) {
  if (fieldLabels[key]) return fieldLabels[key];
  return key
    .replace(/\[\]$/, '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeFields(rawFields) {
  if (!rawFields || typeof rawFields !== 'object' || Array.isArray(rawFields)) return null;

  const normalized = {};
  Object.entries(rawFields).slice(0, 80).forEach(([key, value]) => {
    const safeKey = String(key).slice(0, 80);
    if (Array.isArray(value)) {
      normalized[safeKey] = value.slice(0, 30).map((item) => String(item).trim().slice(0, 2_000));
    } else if (value !== null && value !== undefined) {
      normalized[safeKey] = String(value).trim().slice(0, 8_000);
    }
  });
  return normalized;
}

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const allowed = new Set([
    'https://unicarecleaning.com',
    'https://www.unicarecleaning.com',
    'http://localhost:8888',
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    ...(process.env.BREVO_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim())
  ].filter(Boolean).map((value) => {
    try { return new URL(value).origin; } catch { return ''; }
  }).filter(Boolean));

  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

function getContactName(formType, fields) {
  if (formType === 'assessment') {
    return {
      firstName: fields.first_name || '',
      lastName: fields.last_name || ''
    };
  }

  const parts = String(fields.name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' ')
  };
}

function buildContactAttributes(formType, fields) {
  const { firstName, lastName } = getContactName(formType, fields);
  const attributes = {};
  if (firstName) attributes.FIRSTNAME = firstName.slice(0, 100);
  if (lastName) attributes.LASTNAME = lastName.slice(0, 100);
  return attributes;
}

function formatValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value || '');
}

function buildNotificationHtml(formType, fields) {
  const rows = Object.entries(fields)
    .filter(([key, value]) => !['_website', 'form_type'].includes(key) && formatValue(value))
    .map(([key, value]) => {
      const label = escapeHtml(humanizeField(key));
      const content = escapeHtml(formatValue(value)).replaceAll('\n', '<br>');
      return `<tr><th style="padding:10px 12px;border-bottom:1px solid #ded8cd;text-align:left;vertical-align:top;width:34%;font-size:12px;letter-spacing:.04em;color:#665f55">${label}</th><td style="padding:10px 12px;border-bottom:1px solid #ded8cd;color:#1b1916">${content}</td></tr>`;
    })
    .join('');

  const title = formType === 'assessment'
    ? 'Home Assessment'
    : formType === 'waitlist'
      ? 'Waitlist request'
      : 'The Science of Cleaning';

  return `<!doctype html><html><body style="margin:0;background:#f4f1e9;color:#1b1916;font-family:Arial,sans-serif"><div style="max-width:760px;margin:0 auto;padding:36px 20px"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#786f63">Unicare Cleaning</p><h1 style="margin:0 0 26px;font-family:Georgia,serif;font-size:38px;font-weight:400">${title}</h1><table role="presentation" style="width:100%;border-collapse:collapse;background:#fffdf8;border:1px solid #ded8cd">${rows}</table><p style="margin:20px 0 0;font-size:12px;color:#786f63">Submitted through unicarecleaning.com on ${escapeHtml(new Date().toISOString())}.</p></div></body></html>`;
}

async function brevoRequest(path, apiKey, body) {
  const response = await fetch(`${BREVO_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000)
  });

  if (!response.ok) {
    console.error(`Brevo request failed: ${path} returned ${response.status}`);
    throw new Error('Brevo request failed');
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method not allowed.' });
  }

  if (!isAllowedOrigin(request)) {
    return jsonResponse(403, { ok: false, message: 'Origin not allowed.' });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse(413, { ok: false, message: 'Submission is too large.' });
  }

  let payload;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) return jsonResponse(413, { ok: false, message: 'Submission is too large.' });
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { ok: false, message: 'Invalid submission.' });
  }

  const formType = String(payload?.formType || '').toLowerCase();
  const config = formConfig[formType];
  const fields = normalizeFields(payload?.fields);
  if (!config || !fields) return jsonResponse(400, { ok: false, message: 'Invalid form.' });

  if (fields._website) {
    return jsonResponse(200, { ok: true, message: 'Thank you.' });
  }

  const email = String(fields.email || '').toLowerCase();
  if (!isValidEmail(email)) return jsonResponse(400, { ok: false, message: 'Please enter a valid email address.' });

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number.parseInt(process.env[config.listEnv] || '', 10);
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Unicare Cleaning';
  const notificationEmail = process.env.BREVO_NOTIFICATION_TO || 'contact@unicarecleaning.com';

  if (!apiKey || !Number.isInteger(listId) || listId <= 0 || !isValidEmail(senderEmail) || !isValidEmail(notificationEmail)) {
    console.error(`Brevo environment is incomplete for form type: ${formType}`);
    return jsonResponse(500, { ok: false, message: 'The form is temporarily unavailable. Please try again later.' });
  }

  const { firstName, lastName } = getContactName(formType, fields);
  const contactName = [firstName, lastName].filter(Boolean).join(' ') || email;

  try {
    await brevoRequest('/contacts', apiKey, {
      email,
      attributes: buildContactAttributes(formType, fields),
      listIds: [listId],
      updateEnabled: true
    });

    await brevoRequest('/smtp/email', apiKey, {
      sender: { email: senderEmail, name: senderName },
      to: [{ email: notificationEmail, name: 'Unicare Cleaning' }],
      replyTo: { email, name: contactName },
      subject: config.subject,
      htmlContent: buildNotificationHtml(formType, fields),
      tags: [config.tag]
    });

    return jsonResponse(200, { ok: true, message: 'Your information was sent successfully.' });
  } catch {
    return jsonResponse(502, { ok: false, message: 'We could not send your information. Please try again in a moment.' });
  }
}
