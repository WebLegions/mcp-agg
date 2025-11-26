/**
 * Validator-based Form Input Component
 *
 * Automatically generates form inputs with validation from Validator schemas
 * Uses native HTML5 validation for better performance and UX
 */

import type { Validator } from '../../../shared/libs/validator';
import { dotify, labelify, slugify } from '../../../shared/utils/text';
import type { j } from '../../main';

type SupportedInputType = j.juris.JurisInputElement['type'] | 'select';

/**
 * HTML properties extracted from Validator json schema
 */
interface HtmlProps
    extends Partial<
        Pick<j.juris.JurisInputElement, 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'placeholder'>
    > {
    type: SupportedInputType;
    label: string;
    description?: string;
    defaultValue?: unknown;
    options?: Array<{ value: string; label: string }>; // Options for select dropdown
}

/**
 * Map metadata from Validator to html input attributes
 */
function getHtmlProps(validator: Validator, fieldName: string): HtmlProps {
    const defs = validator.defs();

    const typeMap: Record<string, SupportedInputType> = {
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
    };

    const props: HtmlProps = {
        type: typeMap[defs.type as string] || 'text',
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
        props.type = 'select';
        props.options = defs.enum.map((value) => ({
            value: String(value),
            label: String(value),
        }));
    }

    return props;
}

/**
 * Props for FormInput component
 */
interface FormInputProps {
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
 * formInput({
 *     form: 'serverModal',
 *     name: 'name',
 *     validator: z.string().min(1).max(120).describe('Unique server name'),
 *     initialValue: 'existing-server' // For EDIT mode
 * }, ctx)
 * ```
 */
export const formInput: j.Component<FormInputProps> = (props, ctx) => {
    const {
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
    const htmlProps = getHtmlProps(validator, name);

    // Skip rendering if this is an unsupported type (array, object, etc.)
    if (!htmlProps) return { comment: `Field "${name}" has unsupported type for FormInput (array/object)` };

    const id = slugify(form, name);
    const stateKey = dotify(form, name, 'value');
    const errorKey = dotify(form, name, 'error');

    // Initialize state if not already set
    if (initialValue) {
        ctx.setState(stateKey, initialValue);
    } else {
        ctx.setState(stateKey, ctx.getState(stateKey) || htmlProps.defaultValue || '');
    }

    const text = htmlProps.label + (htmlProps.required ? ' *' : '');

    return {
        div: {
            id: `${id}-field`,
            className: 'form-field',
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
            },
            children: [
                // Header row with Label and Messages (Error/Description)
                {
                    div: {
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
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
                                                text: (): string => {
                                                    const error = ctx.getState(errorKey, '');
                                                    if (!error || error === '') return '';

                                                    const validity = error as unknown as ValidityState;
                                                    if (!validity || Object(validity).valid) return '';

                                                    const label = htmlProps.label;
                                                    const validityMap: Record<string, () => string> = {
                                                        valueMissing: () => `${label} is required`,
                                                        typeMismatch: () =>
                                                            `Please enter a valid ${htmlProps.type === 'email' ? 'email' : htmlProps.type === 'url' ? 'URL' : htmlProps.type}`,
                                                        patternMismatch: () => `${label} is invalid`,
                                                        tooShort: () => `${label} is too short`,
                                                        tooLong: () => `${label} is too long`,
                                                        rangeUnderflow: () => `${label} is too small`,
                                                        rangeOverflow: () => `${label} is too large`,
                                                    };

                                                    const key = Object.keys(validityMap).find((key) => Object(validity)[key]);
                                                    return key
                                                        ? validityMap[key]()
                                                        : `Please enter a valid ${label.toLowerCase()}`;
                                                },
                                            },
                                        },
                                        {
                                            small: {
                                                id: `${id}-description`,
                                                style: {
                                                    display: () => (ctx.getState(errorKey) ? 'none' : 'block'),
                                                    color: 'var(--text-secondary)',
                                                },
                                                text: htmlProps.description || '',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
                // Render select for enums, input for others
                htmlProps.type === 'select'
                    ? {
                          select: {
                              id,
                              name,
                              tabIndex,
                              value: (): string => ctx.getState<string>(stateKey, ''),
                              required: htmlProps.required,
                              disabled,
                              autoFocus,
                              autocomplete,
                              style: ctx.getState(errorKey, '') ? { borderColor: 'var(--danger, #d32f2f)' } : {},
                              onChange: (e: Event) => {
                                  const element = e.target as HTMLSelectElement;
                                  const rawValue = element.value;
                                  ctx.setState(stateKey, rawValue === '' ? '' : rawValue);
                                  ctx.setState(errorKey, element.validity);
                              },
                              onBlur: (e: Event) => {
                                  const element = e.target as HTMLSelectElement;
                                  const rawValue = element.value;
                                  ctx.setState(stateKey, rawValue === '' ? '' : rawValue);
                                  ctx.setState(errorKey, element.validity);
                                  if (propsOnBlur) propsOnBlur(e);
                              },
                              onInvalid: (e: Event) => {
                                  e.preventDefault();
                                  const element = e.target as HTMLSelectElement;
                                  ctx.setState(errorKey, element.validity);
                              },
                              children:
                                  htmlProps.options?.map((opt) => ({
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
                              id,
                              name,
                              tabIndex,
                              type: htmlProps.type,
                              value: (): string => ctx.getState<string>(stateKey, ''),
                              required: htmlProps.required,
                              disabled,
                              autoFocus,
                              autocomplete,
                              minlength: htmlProps.minLength,
                              maxlength: htmlProps.maxLength,
                              min: htmlProps.min,
                              max: htmlProps.max,
                              pattern: htmlProps.pattern,
                              placeholder: htmlProps.placeholder,
                              style: ctx.getState(errorKey, '') ? { borderColor: 'var(--danger, #d32f2f)' } : {},
                              onBlur: (e: Event) => {
                                  const element = e.target as HTMLInputElement;
                                  const rawValue = element.value;
                                  let value: string | number = rawValue === '' ? '' : rawValue;
                                  // Coerce to number if input type is number
                                  if (htmlProps.type === 'number') {
                                      value = Number(value);
                                  }
                                  ctx.setState(stateKey, value);
                                  ctx.setState(errorKey, element.validity);
                                  if (propsOnBlur) propsOnBlur(e);
                              },
                              onInvalid: (e: Event) => {
                                  e.preventDefault();
                                  const element = e.target as HTMLInputElement;
                                  ctx.setState(errorKey, element.validity);
                              },
                          },
                      },
            ],
        },
    };
};

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
