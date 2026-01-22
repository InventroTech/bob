import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

// Separate component for option input to prevent re-renders of entire form
interface OptionInputProps {
  option: { label: string; value: string };
  onLabelChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
}

const OptionInput = memo(({ option, onLabelChange, onValueChange, onRemove }: OptionInputProps) => {
  // Display state for immediate UI updates
  const [displayLabel, setDisplayLabel] = useState(option.label);
  const [displayValue, setDisplayValue] = useState(option.value);
  
  // Refs to store latest values and timeouts
  const latestLabelRef = useRef(option.label);
  const latestValueRef = useRef(option.value);
  const labelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const valueTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync display state when external prop changes (initial load only)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setDisplayLabel(option.label);
      setDisplayValue(option.value);
      latestLabelRef.current = option.label;
      latestValueRef.current = option.value;
    }
  }, [option.label, option.value]);

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    latestLabelRef.current = val;
    setDisplayLabel(val);

    // Clear previous timeout
    if (labelTimeoutRef.current) {
      clearTimeout(labelTimeoutRef.current);
    }

    // Set new debounced update
    labelTimeoutRef.current = setTimeout(() => {
      onLabelChange(latestLabelRef.current);
    }, 500);
  }, [onLabelChange]);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    latestValueRef.current = val;
    setDisplayValue(val);

    // Clear previous timeout
    if (valueTimeoutRef.current) {
      clearTimeout(valueTimeoutRef.current);
    }

    // Set new debounced update
    valueTimeoutRef.current = setTimeout(() => {
      onValueChange(latestValueRef.current);
    }, 500);
  }, [onValueChange]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (labelTimeoutRef.current) clearTimeout(labelTimeoutRef.current);
      if (valueTimeoutRef.current) clearTimeout(valueTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex gap-2 items-center">
      <Input
        placeholder="Display Label"
        value={displayLabel}
        onChange={handleLabelChange}
        className="flex-1"
      />
      <Input
        placeholder="Value"
        value={displayValue}
        onChange={handleValueChange}
        className="flex-1"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRemove}
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

OptionInput.displayName = 'OptionInput';

// Separate component for field inputs to prevent re-renders
interface FieldInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  helpText?: string;
}

const DebouncedFieldInput = memo(({ value: externalValue, onChange, placeholder, helpText }: FieldInputProps) => {
  // Display state for immediate UI updates
  const [displayValue, setDisplayValue] = useState(externalValue);
  
  // Refs for latest value and timeout
  const latestValueRef = useRef(externalValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Only sync on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setDisplayValue(externalValue);
      latestValueRef.current = externalValue;
    }
  }, [externalValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    latestValueRef.current = val;
    setDisplayValue(val);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced update
    timeoutRef.current = setTimeout(() => {
      onChange(latestValueRef.current);
    }, 500);
  }, [onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <Input
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
      />
      {helpText && <p className="text-body-xs text-gray-500 mt-1">{helpText}</p>}
    </>
  );
});

DebouncedFieldInput.displayName = 'DebouncedFieldInput';

export interface RoutingFilterField {
  key: string;       // Field key (e.g., 'state', 'poster', 'source')
  label: string;     // Display label (e.g., 'State', 'Poster', 'Source')
  type: 'text' | 'select' | 'multiselect';  // Field type for the form input
  placeholder?: string;     // Placeholder text
  helpText?: string;        // Help text below the field
  options?: { label: string; value: string }[];  // For select/multiselect type
}

export interface RoutingRulesConfigData {
  filterFields: RoutingFilterField[];
  title?: string;
  description?: string;
}

interface RoutingRulesConfigProps {
  localConfig: RoutingRulesConfigData;
  onConfigChange: (config: Partial<RoutingRulesConfigData>) => void;
}

const DEFAULT_FIELD: RoutingFilterField = {
  key: '',
  label: '',
  type: 'text',
  placeholder: '',
  helpText: '',
  options: [],
};

export const RoutingRulesConfig: React.FC<RoutingRulesConfigProps> = ({
  localConfig,
  onConfigChange,
}) => {
  // Display states for immediate UI updates (like LeadTableComponent's displaySearchTerm)
  const [displayTitle, setDisplayTitle] = useState(localConfig.title || '');
  const [displayDescription, setDisplayDescription] = useState(localConfig.description || '');
  const [displayFilterFields, setDisplayFilterFields] = useState<RoutingFilterField[]>(
    localConfig.filterFields || []
  );

  // Refs to store latest values (like LeadTableComponent's latestSearchValueRef)
  const latestTitleRef = useRef(localConfig.title || '');
  const latestDescriptionRef = useRef(localConfig.description || '');
  const latestFilterFieldsRef = useRef<RoutingFilterField[]>(localConfig.filterFields || []);

  // Timeout refs for debouncing (like LeadTableComponent's searchTimeoutRef)
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterFieldsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track initial mount to only sync once
  const isInitialMount = useRef(true);

  // Only sync on initial mount (like LeadTableComponent pattern)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setDisplayTitle(localConfig.title || '');
      setDisplayDescription(localConfig.description || '');
      setDisplayFilterFields(localConfig.filterFields || []);
      latestTitleRef.current = localConfig.title || '';
      latestDescriptionRef.current = localConfig.description || '';
      latestFilterFieldsRef.current = localConfig.filterFields || [];
    }
  }, [localConfig.title, localConfig.description, localConfig.filterFields]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
      if (descriptionTimeoutRef.current) clearTimeout(descriptionTimeoutRef.current);
      if (filterFieldsTimeoutRef.current) clearTimeout(filterFieldsTimeoutRef.current);
    };
  }, []);

  // Handle title change - following LeadTableComponent's debouncedSearch pattern
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    latestTitleRef.current = value;
    setDisplayTitle(value);

    // Clear previous timeout
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    // Set new debounced update
    titleTimeoutRef.current = setTimeout(() => {
      onConfigChange({ title: latestTitleRef.current });
    }, 500);
  }, [onConfigChange]);

  // Handle description change
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    latestDescriptionRef.current = value;
    setDisplayDescription(value);

    // Clear previous timeout
    if (descriptionTimeoutRef.current) {
      clearTimeout(descriptionTimeoutRef.current);
    }

    // Set new debounced update
    descriptionTimeoutRef.current = setTimeout(() => {
      onConfigChange({ description: latestDescriptionRef.current });
    }, 500);
  }, [onConfigChange]);

  // Handle filter fields changes with debouncing
  const updateFilterFields = useCallback((newFields: RoutingFilterField[]) => {
    latestFilterFieldsRef.current = newFields;
    setDisplayFilterFields(newFields);

    // Clear previous timeout
    if (filterFieldsTimeoutRef.current) {
      clearTimeout(filterFieldsTimeoutRef.current);
    }

    // Set new debounced update
    filterFieldsTimeoutRef.current = setTimeout(() => {
      onConfigChange({ filterFields: latestFilterFieldsRef.current });
    }, 500);
  }, [onConfigChange]);

  const handleAddField = useCallback(() => {
    updateFilterFields([...latestFilterFieldsRef.current, { ...DEFAULT_FIELD }]);
  }, [updateFilterFields]);

  const handleRemoveField = useCallback((index: number) => {
    const newFields = latestFilterFieldsRef.current.filter((_, i) => i !== index);
    updateFilterFields(newFields);
  }, [updateFilterFields]);

  const handleFieldChange = useCallback((index: number, field: keyof RoutingFilterField, value: any) => {
    const newFields = [...latestFilterFieldsRef.current];
    newFields[index] = { ...newFields[index], [field]: value };
    updateFilterFields(newFields);
  }, [updateFilterFields]);

  const handleAddOption = useCallback((fieldIndex: number) => {
    const newFields = [...latestFilterFieldsRef.current];
    const currentOptions = newFields[fieldIndex].options || [];
    // Generate a temporary unique value - user should replace it
    const tempValue = `option_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    newFields[fieldIndex] = {
      ...newFields[fieldIndex],
      options: [...currentOptions, { label: 'New Option', value: tempValue }]
    };
    updateFilterFields(newFields);
  }, [updateFilterFields]);

  const handleRemoveOption = useCallback((fieldIndex: number, optionIndex: number) => {
    const newFields = [...latestFilterFieldsRef.current];
    newFields[fieldIndex] = {
      ...newFields[fieldIndex],
      options: (newFields[fieldIndex].options || []).filter((_, i) => i !== optionIndex)
    };
    updateFilterFields(newFields);
  }, [updateFilterFields]);

  const handleOptionChange = useCallback((fieldIndex: number, optionIndex: number, key: 'label' | 'value', value: string) => {
    const newFields = [...latestFilterFieldsRef.current];
    const options = [...(newFields[fieldIndex].options || [])];
    options[optionIndex] = { ...options[optionIndex], [key]: value };
    newFields[fieldIndex] = { ...newFields[fieldIndex], options };
    updateFilterFields(newFields);
  }, [updateFilterFields]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Component Title (Optional)</Label>
        <Input
          value={displayTitle}
          onChange={handleTitleChange}
          placeholder="Routing Rules"
        />
      </div>

      <div className="space-y-2">
        <Label>Description (Optional)</Label>
        <Input
          value={displayDescription}
          onChange={handleDescriptionChange}
          placeholder="Configure which tickets and leads each agent should receive."
        />
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <Label>Filter Fields</Label>
          <span className="text-body-xs text-muted">
            {displayFilterFields.length} field{displayFilterFields.length !== 1 ? 's' : ''} configured
          </span>
        </div>

        {displayFilterFields.length === 0 && (
          <p className="text-body-sm text-muted mb-4">
            No filter fields configured. Add fields like "state", "poster", "source" to customize routing conditions.
          </p>
        )}

        {displayFilterFields.map((field, index) => (
          <div key={index} className="space-y-3 p-4 border rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter Field {index + 1}</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveField(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field Key</Label>
                <DebouncedFieldInput
                  value={field.key}
                  onChange={(val) => handleFieldChange(index, 'key', val)}
                  placeholder="state"
                  helpText="The field name in conditions (e.g., state, poster)"
                />
              </div>
              <div>
                <Label>Display Label</Label>
                <DebouncedFieldInput
                  value={field.label}
                  onChange={(val) => handleFieldChange(index, 'label', val)}
                  placeholder="State"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value: 'text' | 'select' | 'multiselect') => handleFieldChange(index, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Input</SelectItem>
                    <SelectItem value="select">Dropdown Select</SelectItem>
                    <SelectItem value="multiselect">Multi-Select</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Placeholder</Label>
                <DebouncedFieldInput
                  value={field.placeholder || ''}
                  onChange={(val) => handleFieldChange(index, 'placeholder', val)}
                  placeholder="e.g. Tamil Nadu"
                />
              </div>
            </div>

            <div>
              <Label>Help Text (Optional)</Label>
              <DebouncedFieldInput
                value={field.helpText || ''}
                onChange={(val) => handleFieldChange(index, 'helpText', val)}
                placeholder="Enter comma-separated values for multiple matches"
              />
            </div>

            {/* Select/Multiselect options */}
            {(field.type === 'select' || field.type === 'multiselect') && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>{field.type === 'multiselect' ? 'Multi-Select Options' : 'Dropdown Options'}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddOption(index)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>

                {(field.options || []).map((option, optionIndex) => (
                  <OptionInput
                    key={`${index}-${optionIndex}`}
                    option={option}
                    onLabelChange={(val) => handleOptionChange(index, optionIndex, 'label', val)}
                    onValueChange={(val) => handleOptionChange(index, optionIndex, 'value', val)}
                    onRemove={() => handleRemoveOption(index, optionIndex)}
                  />
                ))}

                {(!field.options || field.options.length === 0) && (
                  <p className="text-body-xs text-muted">
                    Add options for the dropdown select.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddField}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Filter Field
        </Button>
      </div>
    </div>
  );
};
