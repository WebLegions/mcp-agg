/**
 * Validator-based Form Input Component
 *
 * Automatically generates form inputs with validation from Validator schemas
 * Uses native HTML5 validation for better performance and UX
 */

import type { Validator } from '../../shared/libs/validator';
import { dotify, labelify, slugify } from '../../shared/utils/text';
import type { JurisContext, JurisVDOMElement } from '../types/juris';

/**
 * Input types supported by ValidatorInput (aligns with Juris InputElement type)
 */
type SupportedInputType = 'text' | 'email' | 'url' | 'number' | 'tel' | 'password' | 'search';

/**
 * Field metadata extracted from Validator schema
 */
interface FieldMetadata {
    type?: SupportedInputType;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: string;
    max?: string;
    pattern?: string;
    placeholder?: string;
    label: string;
    description?: string;
    defaultValue?: unknown;
    isSelect?: boolean; // True if field should render as <select>
    options?: Array<{ value: string; label: string }>; // Options for select dropdown
}

/**
 * Extract field metadata from Validator schema
 * Only returns properties that exist in the schema defs
 */
function extractFieldMetadata(validator: Validator, fieldName: string): FieldMetadata {
    const defs = validator.defs();
    const metadata: FieldMetadata = {
        label: labelify(fieldName),
    };

    // Check if this is an enum/select field
    if (defs.enum && Array.isArray(defs.enum)) {
        metadata.isSelect = true;
        metadata.options = defs.enum.map((value) => ({
            value: String(value),
            label: String(value),
        }));
    } else {
        // Only add input type properties for non-select fields
        if (defs.type === 'number' || defs.type === 'integer') {
            metadata.type = 'number';
        } else if (defs.format === 'email') {
            metadata.type = 'email';
        } else if (defs.format === 'uri' || defs.format === 'url') {
            metadata.type = 'url';
        } else {
            metadata.type = 'text';
        }
    }

    // Required if not optional and no default
    if (!validator.isOptional && defs.default === undefined) {
        metadata.required = true;
    }

    // String constraints
    if (defs.minLength !== undefined) {
        metadata.minLength = defs.minLength;
    }
    if (defs.maxLength !== undefined) {
        metadata.maxLength = defs.maxLength;
    }
    if (defs.pattern !== undefined) {
        metadata.pattern = defs.pattern;
    }

    // Number constraints (as strings for HTML attributes)
    if (defs.minimum !== undefined) {
        metadata.min = String(defs.minimum);
    }
    if (defs.maximum !== undefined) {
        metadata.max = String(defs.maximum);
    }

    // Description from schema
    if (defs.description !== undefined) {
        metadata.description = defs.description;
    }

    // Default value from schema
    if (defs.default !== undefined) {
        metadata.defaultValue = defs.default;
    }

    // Use first example as placeholder (if available)
    if (defs.examples && defs.examples.length > 0) {
        metadata.placeholder = String(defs.examples[0]);
    }

    return metadata;
}

/**
 * Generate user-friendly validation message based on validity state
 */
function getValidationMessage(validity: ValidityState, metadata: FieldMetadata): string {
    const label = metadata.label;

    if (validity.valueMissing) {
        return `${label} is required`;
    }
    if (validity.typeMismatch) {
        if (metadata.type === 'email') return 'Please enter a valid email address';
        if (metadata.type === 'url') return 'Please enter a valid URL';
        return `Please enter a valid ${metadata.type}`;
    }
    if (validity.patternMismatch) {
        return metadata.description || `${label} format is invalid`;
    }
    if (validity.tooShort) {
        return `${label} must be at least ${metadata.minLength} characters`;
    }
    if (validity.tooLong) {
        return `${label} must be at most ${metadata.maxLength} characters`;
    }
    if (validity.rangeUnderflow) {
        return `${label} must be at least ${metadata.min}`;
    }
    if (validity.rangeOverflow) {
        return `${label} must be at most ${metadata.max}`;
    }

    return `Please enter a valid ${label.toLowerCase()}`;
}

/**
 * Props for ValidatorInput component
 */
interface ValidatorInputProps {
    ctx: JurisContext;
    formName: string; // Form name to namespace state keys
    fieldName: string; // Field name within the form
    validator: Validator; // Validator schema for this field
    disabled?: boolean;
    autoFocus?: boolean;
    initialValue?: unknown; // For EDIT mode - initialize with existing value
    tabIndex?: number; // Explicit tab order (optional, browser uses DOM order by default)
}

/**
 * Smart form input component that derives all properties from Validator schema
 *
 * Features:
 * - Extracts validation rules from schema (min, max, pattern, required)
 * - Generates native HTML5 validation attributes
 * - Provides ARIA accessibility attributes
 * - Shows default values from schema
 * - Displays field descriptions as help text
 * - Supports both CREATE and EDIT modes
 * - Uses form-namespaced state keys to prevent conflicts
 *
 * @example
 * ```typescript
 * ValidatorInput({
 *     ctx,
 *     formName: 'serverModal',
 *     fieldName: 'name',
 *     validator: z.string().min(1).max(120).describe('Unique server name'),
 *     initialValue: 'existing-server' // For EDIT mode
 * })
 * ```
 */
export function ValidatorInput(props: ValidatorInputProps): JurisVDOMElement {
    const { ctx, formName, fieldName, validator, disabled, autoFocus, initialValue = '', tabIndex } = props;
    const metadata = extractFieldMetadata(validator, fieldName);

    // HTML ID uses kebab-case
    const slug = slugify(formName, fieldName);

    // State keys use dot-notation for hierarchical organization
    const stateKey = dotify(formName, fieldName);
    const errorKey = dotify(formName, fieldName, 'error');

    // Determine initial value: initialValue (EDIT) > defaultValue (CREATE) > empty string
    // Handle arrays by joining with spaces, undefined/null as empty string
    let defaultVal = '';
    if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
        defaultVal = Array.isArray(initialValue) ? initialValue.join(' ') : String(initialValue);
    } else if (metadata.defaultValue !== undefined && metadata.defaultValue !== null) {
        defaultVal = Array.isArray(metadata.defaultValue) ? metadata.defaultValue.join(' ') : String(metadata.defaultValue);
    }

    // Initialize state if not already set
    if (ctx.getState(stateKey) === undefined) {
        ctx.setState(stateKey, defaultVal);
    }

    // Get current error message from state
    const errorMessage = ctx.getState<string>(errorKey, '');

    // Build label text with description inline
    const labelText =
        metadata.label + (metadata.required ? ' *' : '') + (metadata.description ? ` — ${metadata.description}` : '');

    // Unified validation handler - called on blur and invalid events
    const validateElement = (element: HTMLInputElement | HTMLSelectElement) => {
        if ('validity' in element && !element.validity.valid) {
            const message = getValidationMessage(element.validity, metadata);
            ctx.setState(errorKey, message);
        }
    };

    // Common event handlers for both input and select
    const handleInput = (e: Event) => {
        const element = e.target as HTMLInputElement | HTMLSelectElement;
        ctx.setState(stateKey, element.value);

        // Clear error on input
        if (errorMessage) {
            ctx.setState(errorKey, '');
        }
    };

    const handleBlur = (e: Event) => {
        validateElement(e.target as HTMLInputElement | HTMLSelectElement);
    };

    const handleInvalid = (e: Event) => {
        e.preventDefault();
        validateElement(e.target as HTMLInputElement | HTMLSelectElement);
    };

    return {
        div: {
            id: `${slug}-field`,
            className: 'form-field',
            children: [
                // Label with inline description
                { label: { htmlFor: slug, text: labelText } },

                // Render select for enums, input for others
                metadata.isSelect
                    ? {
                          select: {
                              id: slug,
                              name: fieldName,
                              ...(tabIndex !== undefined && { tabIndex }),
                              value: (): string => ctx.getState<string>(stateKey, defaultVal),
                              ...(metadata.required !== undefined && { required: metadata.required }),
                              ...(disabled !== undefined && { disabled }),
                              ...(autoFocus !== undefined && { autofocus: autoFocus }),
                              ...(errorMessage && { style: { borderColor: 'var(--danger, #d32f2f)' } }),
                              onChange: handleInput,
                              onBlur: handleBlur,
                              onInvalid: handleInvalid,
                              children:
                                  metadata.options?.map((opt) => ({
                                      option: { value: opt.value, text: opt.label },
                                  })) || [],
                          },
                      }
                    : {
                          input: {
                              id: slug,
                              name: fieldName,
                              ...(tabIndex !== undefined && { tabIndex }),
                              type: metadata.type,

                              // Value bound to Juris state
                              value: (): string => ctx.getState<string>(stateKey, defaultVal),

                              // Native HTML5 validation attributes (only if defined)
                              ...(metadata.required !== undefined && { required: metadata.required }),
                              ...(metadata.minLength !== undefined && { minlength: metadata.minLength }),
                              ...(metadata.maxLength !== undefined && { maxlength: metadata.maxLength }),
                              ...(metadata.min !== undefined && { min: metadata.min }),
                              ...(metadata.max !== undefined && { max: metadata.max }),
                              ...(metadata.pattern !== undefined && { pattern: metadata.pattern }),
                              ...(metadata.placeholder !== undefined && { placeholder: metadata.placeholder }),
                              ...(disabled !== undefined && { disabled }),
                              ...(autoFocus !== undefined && { autofocus: autoFocus }),

                              // Show red border if there's an error
                              ...(errorMessage && { style: { borderColor: 'var(--danger, #d32f2f)' } }),

                              // Event handlers (using common handlers)
                              onInput: handleInput,
                              onBlur: handleBlur,
                              onInvalid: handleInvalid,
                          },
                      },

                // Error message (description is now in label)
                errorMessage
                    ? {
                          small: {
                              id: `${slug}-error`,
                              className: 'error-text',
                              style: { color: 'var(--danger, #d32f2f)' },
                              text: errorMessage,
                          },
                      }
                    : { small: { text: '' } }, // Empty placeholder to maintain layout
            ],
        },
    };
}

/**
 * Extract field validators from an object schema
 * Uses type assertion to access internal schema structure
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *     name: z.string().min(1),
 *     url: z.string().url()
 * });
 *
 * const validators = extractFieldValidators(schema);
 * // validators.name -> string validator with min(1)
 * // validators.url -> string validator with url()
 * ```
 */
export function extractFieldValidators<T extends Record<string, Validator>>(objectValidator: Validator): T {
    // Type assertion to access internal _schema property
    // This is safe because we know ObjV has _schema
    const schema = (objectValidator as unknown as { _schema: T })._schema;

    if (!schema) {
        throw new Error('Validator is not an object schema');
    }

    return schema;
}
