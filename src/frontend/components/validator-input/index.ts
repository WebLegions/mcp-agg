/**
 * Validator-based Form Input Component
 *
 * Automatically generates form inputs with validation from Validator schemas
 * Uses native HTML5 validation for better performance and UX
 */

import type { Validator } from '../../../shared/libs/validator';
import { dotify, labelify, slugify } from '../../../shared/utils/text';
import type { JurisContext, JurisInputElement, JurisVDOMElement } from '../../types/juris';

type SupportedInputType = JurisInputElement['type'] | 'select';

/**
 * Field metadata extracted from Validator json schema
 */
interface FieldMetadata
    extends Partial<Pick<JurisInputElement, 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'placeholder'>> {
    type: SupportedInputType;
    label: string;
    description?: string;
    defaultValue?: unknown;
    options?: Array<{ value: string; label: string }>; // Options for select dropdown
}

/**
 * Map metadata from Validator to html input attributes
 */
function getMeta(validator: Validator, fieldName: string): FieldMetadata {
    const defs = validator.defs();

    const type =
        (
            {
                number: 'number',
                integer: 'number',
                email: 'email',
                uri: 'url',
                url: 'url',
                date: 'date',
                time: 'time',
                'date-time': 'datetime-local',
                password: 'password',
                tel: 'tel',
                phone: 'tel',
                search: 'search',
            } as const
        )[defs.type as keyof SupportedInputType] || 'text';

    const metadata: FieldMetadata = {
        type,
        label: labelify(fieldName),
        required: !validator.isOptional,
        defaultValue: defs.default,
        minLength: defs.minLength,
        maxLength: defs.maxLength,
        pattern: defs.pattern,
        min: defs.minimum,
        max: defs.maximum,
        description: defs.description,
        placeholder: Array.isArray(defs.examples) && defs.examples.length > 0 ? String(defs.examples[0]) : undefined,
    };

    // Check if this is an enum/select field
    if (defs.enum && Array.isArray(defs.enum)) {
        metadata.type = 'select';
        metadata.options = defs.enum.map((value) => ({
            value: String(value),
            label: String(value),
        }));
    }

    return metadata;
}

/**
 * Generate user-friendly validation message based on validity state
 */
function getError(validity: ValidityState, metadata: FieldMetadata): string {
    if (!validity || validity.valid) return '';

    const label = metadata.label;
    const resp = {
        valueMissing: () => `${label} is required`,
        typeMismatch: () =>
            `Please enter a valid ${metadata.type === 'email' ? 'email' : metadata.type === 'url' ? 'URL' : metadata.type}`,
        patternMismatch: () => `${label} is invalid`,
        tooShort: () => `${label} is too short`,
        tooLong: () => `${label} is too long`,
        rangeUnderflow: () => `${label} is too small`,
        rangeOverflow: () => `${label} is too large`,
    } as const;

    const key = Object.keys(resp).find((key) => Object(validity)[key]);
    const msg = key ? Object(resp)[key]() : `Please enter a valid ${label.toLowerCase()}`;
    return msg;
}

/**
 * Props for ValidatorInput component
 */
interface ValidatorInputProps {
    ctx: JurisContext;
    form: string; // Form name to namespace state keys
    name: string; // Field name within the form
    validator: Validator; // Validator schema for this field
    disabled?: boolean;
    autoFocus?: boolean;
    initialValue?: unknown; // For EDIT mode - initialize with existing value
    tabIndex?: number; // Explicit tab order (optional, browser uses DOM order by default)
    autocomplete?: string; // Hint for browser autofill
    onBlur?: (e: Event) => void; // Optional blur handler
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
    const {
        ctx,
        form,
        name,
        validator,
        disabled,
        autoFocus,
        initialValue = '',
        tabIndex,
        autocomplete = 'off',
        onBlur: propsOnBlur,
    } = props;
    const metadata = getMeta(validator, name);

    // Skip rendering if this is an unsupported type (array, object, etc.)
    if (!metadata) return { comment: `Field "${name}" has unsupported type for ValidatorInput (array/object)` };
    const id = slugify(form, name);
    const stateKey = dotify(form, name, 'value');
    const errorKey = dotify(form, name, 'error');

    // Initialize state if not already set
    if (initialValue) {
        ctx.setState(stateKey, initialValue);
    } else {
        ctx.setState(stateKey, ctx.getState(stateKey) || metadata.defaultValue || '');
    }

    // Unified validation handler - called on blur and invalid events
    const validateElement = (element: HTMLInputElement | HTMLSelectElement) => {
        ctx.setState(errorKey, getError(element.validity, metadata));
    };

    // Common event handlers for both input and select
    const onChange = (e: Event) => {
        const element = e.target as HTMLInputElement | HTMLSelectElement;
        const rawValue = element.value;

        // Save undefined for empty strings to keep state clean
        let value: string | number = rawValue === '' ? '' : rawValue;

        // Coerce to number if input type is number
        if (metadata.type === 'number') {
            value = Number(value);
        }

        ctx.setState(stateKey, value);
        validateElement(element);
    };

    // For text inputs, we only update state on blur to avoid re-renders while typing
    // This prevents focus loss and cursor jumping
    const onBlur = (e: Event) => {
        onChange(e);
        if (propsOnBlur) {
            propsOnBlur(e);
        }
    };

    const onInvalid = (e: Event) => {
        e.preventDefault();
        const element = e.target as HTMLInputElement | HTMLSelectElement;
        validateElement(element);
    };

    const text = metadata.label + (metadata.required ? ' *' : '');

    // Build common attributes shared by both select and input
    const commonAttrs = {
        id,
        name,
        tabIndex,
        value: (): string => ctx.getState<string>(stateKey, ''),
        required: metadata.required,
        disabled,
        autoFocus,
        autocomplete,
        ...(ctx.getState(errorKey, '') ? { style: { borderColor: 'var(--danger, #d32f2f)' } } : {}),
        onInvalid,
        onBlur,
    };

    return {
        div: {
            id: `${id}-field`,
            className: 'form-field',
            children: [
                // Header row with Label and Messages (Error/Description)
                {
                    div: {
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: '4px',
                        },
                        children: [
                            { label: { htmlFor: id, text } },
                            {
                                div: {
                                    style: { textAlign: 'right' },
                                    children: [
                                        {
                                            small: {
                                                id: `${id}-error`,
                                                className: 'error-text',
                                                style: { color: 'var(--danger, #d32f2f)', display: 'block' },
                                                text: () => ctx.getState(errorKey, '') || '',
                                            },
                                        },
                                        {
                                            small: {
                                                id: `${id}-description`,
                                                style: {
                                                    display: () => (ctx.getState(errorKey) ? 'none' : 'block'),
                                                    color: 'var(--text-secondary)',
                                                },
                                                text: metadata.description || '',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
                // Render select for enums, input for others
                metadata.type === 'select'
                    ? {
                          select: {
                              ...commonAttrs,
                              onChange, // Selects update on change
                              children:
                                  metadata.options?.map((opt) => ({
                                      option: { value: opt.value, text: opt.label },
                                  })) || [],
                          },
                      }
                    : /**
                       * TODO: Add support for other types:
                       * month, week, color, range, checkbox, radio, file
                       */
                      {
                          input: {
                              ...commonAttrs,
                              type: metadata.type,
                              // Input-specific validation attributes
                              ...Object.fromEntries(
                                  Object.entries({
                                      minlength: metadata.minLength,
                                      maxlength: metadata.maxLength,
                                      min: metadata.min,
                                      max: metadata.max,
                                      pattern: metadata.pattern,
                                      placeholder: metadata.placeholder,
                                  }).filter(([_, v]) => v !== undefined),
                              ),
                          },
                      },
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
