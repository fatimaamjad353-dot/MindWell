// src/utils/emailValidator.js
const dns = require('dns');
const { promisify } = require('util');

const resolveMx = promisify(dns.resolveMx);

// ─── Common Typos to Fix ──────────────────────────────────────
const COMMON_TYPOS = {
    'gmail.con': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmil.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmail.cm': 'gmail.com',
    'gmail.ocm': 'gmail.com',
    'yahoo.con': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'yhoo.com': 'yahoo.com',
    'hotmail.con': 'hotmail.com',
    'hotmil.com': 'hotmail.com',
    'hotmail.co': 'hotmail.com',
    'outlook.con': 'outlook.com',
    'outlok.com': 'outlook.com',
    'outlook.co': 'outlook.com',
};

// ─── Disposable Email Domains ────────────────────────────────
const DISPOSABLE_DOMAINS = [
    'mailinator.com', 'guerrillamail.com', '10minutemail.com',
    'tempmail.com', 'throwawaymail.com', 'yopmail.com',
    'getnada.com', 'spamgourmet.com', 'trashmail.com',
    'maildrop.cc', 'temp-mail.org', 'fakeinbox.com',
    'tempinbox.com', 'mytrashmail.com', 'mailexpire.com',
    'spambox.us', 'tempmail.net', 'guerrillamail.net',
];

// ─── Validation Result ────────────────────────────────────────
class ValidationResult {
    constructor(valid, message, correctedEmail = null) {
        this.valid = valid;
        this.message = message;
        this.correctedEmail = correctedEmail;
    }
}

// ─── Main Validation Function ──────────────────────────────────
class EmailValidator {
    
    // ─── Format Validation ──────────────────────────────────────
    static validateFormat(email) {
        const trimmed = email.trim().toLowerCase();
        
        // Check if empty
        if (!trimmed) {
            return new ValidationResult(false, 'Email address is required.');
        }

        // Check for @ symbol
        if (!trimmed.includes('@')) {
            return new ValidationResult(false, 'Email must contain "@" symbol.');
        }

        // Check for domain
        const parts = trimmed.split('@');
        if (parts.length !== 2) {
            return new ValidationResult(false, 'Invalid email format.');
        }

        const localPart = parts[0];
        const domain = parts[1];

        // Check local part
        if (!localPart || localPart.length < 1) {
            return new ValidationResult(false, 'Email must have a username before "@".');
        }

        // Check domain
        if (!domain || domain.length < 3) {
            return new ValidationResult(false, 'Email must have a valid domain after "@".');
        }

        // Check for dot in domain
        if (!domain.includes('.')) {
            return new ValidationResult(false, 'Email domain must contain a dot (e.g., .com).');
        }

        // Check for invalid characters
        const invalidChars = /[^a-zA-Z0-9@._-]/;
        if (invalidChars.test(trimmed)) {
            return new ValidationResult(false, 'Email contains invalid characters.');
        }

        // Check for spaces
        if (trimmed.includes(' ')) {
            return new ValidationResult(false, 'Email cannot contain spaces.');
        }

        // Check for consecutive dots
        if (trimmed.includes('..')) {
            return new ValidationResult(false, 'Email cannot contain consecutive dots.');
        }

        return new ValidationResult(true, 'Valid format.');
    }

    // ─── Fix Common Typos ──────────────────────────────────────
    static fixTypos(email) {
        const trimmed = email.trim().toLowerCase();
        const parts = trimmed.split('@');
        
        if (parts.length !== 2) return trimmed;

        const domain = parts[1];
        const correctedDomain = COMMON_TYPOS[domain] || domain;

        if (correctedDomain !== domain) {
            return `${parts[0]}@${correctedDomain}`;
        }

        return trimmed;
    }

    // ─── Check Disposable Email ────────────────────────────────
    static isDisposable(email) {
        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain) return false;
        
        return DISPOSABLE_DOMAINS.some(d => domain.includes(d));
    }

 // ─── Check MX Record (Domain Exists) ──────────────────────
static async checkMXRecord(email) {
    try {
        const domain = email.split('@')[1];
        if (!domain) return false;

        console.log(`📧 Resolving MX for domain: ${domain}`);
        
        const dns = require('dns');
        const { promisify } = require('util');
        const resolveMx = promisify(dns.resolveMx);
        
        const mxRecords = await resolveMx(domain);
        console.log(`📧 MX Records found: ${mxRecords ? mxRecords.length : 0}`);
        
        return mxRecords && mxRecords.length > 0;
    } catch (error) {
        console.error(`❌ MX lookup failed for ${email}:`, error.message);
        return false;
    }
}
    // ─── Full Validation ────────────────────────────────────────
static async validateEmail(email, checkMX = true) {
    // ─── Step 1: Check Format ──────────────────────────────
    const formatResult = this.validateFormat(email);
    if (!formatResult.valid) {
        return formatResult;
    }

    // ─── Step 2: Fix Typos ──────────────────────────────────
    const correctedEmail = this.fixTypos(email);
    if (correctedEmail !== email) {
        return new ValidationResult(
            true,
            `Did you mean "${correctedEmail}"?`,
            correctedEmail
        );
    }

    // ─── Step 3: Check Disposable Email ────────────────────
    if (this.isDisposable(correctedEmail)) {
        return new ValidationResult(
            false,
            'Temporary or disposable email addresses are not allowed. Please use a real email address.'
        );
    }

    // ─── Step 4: Check MX Record (Domain Exists) ────────────
    if (checkMX) {
        console.log(`📧 Checking MX record for: ${correctedEmail}`);
        const hasMX = await this.checkMXRecord(correctedEmail);
        console.log(`📧 MX record exists: ${hasMX}`);
        
        if (!hasMX) {
            return new ValidationResult(
                false,
                'This email domain does not appear to exist. Please check your email address.'
            );
        }
    }

    return new ValidationResult(true, 'Valid email address.', correctedEmail);
}

    // ─── Simple Validation (No MX Check) ──────────────────────
    static validateEmailSimple(email) {
        const result = this.validateFormat(email);
        if (!result.valid) return result;

        const correctedEmail = this.fixTypos(email);
        if (correctedEmail !== email) {
            return new ValidationResult(
                true,
                `Did you mean "${correctedEmail}"?`,
                correctedEmail
            );
        }

        if (this.isDisposable(correctedEmail)) {
            return new ValidationResult(
                false,
                'Temporary or disposable email addresses are not allowed.'
            );
        }

        return new ValidationResult(true, 'Valid email address.', correctedEmail);
    }

    // ─── Common Email Patterns for Frontend ────────────────────
    static getEmailPattern() {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    }

    static getEmailHelpText() {
        return 'Enter a valid email address (e.g., name@example.com)';
    }

    static getEmailPlaceholder() {
        return 'name@example.com';
    }
}

module.exports = EmailValidator;