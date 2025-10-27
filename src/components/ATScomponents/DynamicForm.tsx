import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Copy, 
  Eye, 
  Settings,
  Type,
  List,
  CheckSquare,
  Circle,
  Calendar,
  Mail,
  Phone,
  FileText,
  Hash,
  ToggleLeft,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

// Question types available
export const QUESTION_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea', 
  EMAIL: 'email',
  PHONE: 'phone',
  NUMBER: 'number',
  DATE: 'date',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  BOOLEAN: 'boolean',
  FILE: 'file'
} as const;

export type QuestionType = typeof QUESTION_TYPES[keyof typeof QUESTION_TYPES];

// Question interface
export interface FormQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select, radio, checkbox
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Form interface
export interface DynamicFormData {
  id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
  settings: {
    allowMultipleSubmissions: boolean;
    showProgressBar: boolean;
    collectEmail: boolean;
  };
}

// Question type icons and labels
const QUESTION_TYPE_CONFIG = {
  [QUESTION_TYPES.TEXT]: { icon: Type, label: 'Short Text', color: 'bg-blue-500' },
  [QUESTION_TYPES.TEXTAREA]: { icon: FileText, label: 'Long Text', color: 'bg-green-500' },
  [QUESTION_TYPES.EMAIL]: { icon: Mail, label: 'Email', color: 'bg-purple-500' },
  [QUESTION_TYPES.PHONE]: { icon: Phone, label: 'Phone', color: 'bg-orange-500' },
  [QUESTION_TYPES.NUMBER]: { icon: Hash, label: 'Number', color: 'bg-red-500' },
  [QUESTION_TYPES.DATE]: { icon: Calendar, label: 'Date', color: 'bg-indigo-500' },
  [QUESTION_TYPES.SELECT]: { icon: List, label: 'Dropdown', color: 'bg-yellow-500' },
  [QUESTION_TYPES.RADIO]: { icon: Circle, label: 'Multiple Choice', color: 'bg-pink-500' },
  [QUESTION_TYPES.CHECKBOX]: { icon: CheckSquare, label: 'Checkboxes', color: 'bg-teal-500' },
  [QUESTION_TYPES.BOOLEAN]: { icon: ToggleLeft, label: 'Yes/No', color: 'bg-gray-500' },
  [QUESTION_TYPES.FILE]: { icon: Upload, label: 'File Upload', color: 'bg-cyan-500' }
};

interface DynamicFormProps {
  initialForm?: DynamicFormData;
  onSave?: (form: DynamicFormData) => void;
  onPreview?: (form: DynamicFormData) => void;
  mode?: 'edit' | 'preview' | 'fill';
  className?: string;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  initialForm,
  onSave,
  onPreview,
  mode = 'edit',
  className = ''
}) => {
  // Form state
  const [form, setForm] = useState<DynamicFormData>(
    initialForm || {
      id: `form_${Date.now()}`,
      title: 'Untitled Form',
      description: '',
      questions: [],
      settings: {
        allowMultipleSubmissions: true,
        showProgressBar: false,
        collectEmail: false
      }
    }
  );

  // UI state
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Add new question
  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion: FormQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      title: `Question ${form.questions.length + 1}`,
      description: '',
      required: false,
      placeholder: '',
      options: ['select', 'radio', 'checkbox'].includes(type) ? ['Option 1'] : undefined
    };

    setForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    setSelectedQuestion(newQuestion.id);
    toast.success('Question added successfully');
  }, [form.questions.length]);

  // Update question
  const updateQuestion = useCallback((questionId: string, updates: Partial<FormQuestion>) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
  }, []);

  // Delete question
  const deleteQuestion = useCallback((questionId: string) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
    setSelectedQuestion(null);
    toast.success('Question deleted');
  }, []);

  // Duplicate question
  const duplicateQuestion = useCallback((questionId: string) => {
    const question = form.questions.find(q => q.id === questionId);
    if (!question) return;

    const duplicated: FormQuestion = {
      ...question,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: `${question.title} (Copy)`
    };

    const questionIndex = form.questions.findIndex(q => q.id === questionId);
    setForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions.slice(0, questionIndex + 1),
        duplicated,
        ...prev.questions.slice(questionIndex + 1)
      ]
    }));
    toast.success('Question duplicated');
  }, [form.questions]);

  // Move question
  const moveQuestion = useCallback((questionId: string, direction: 'up' | 'down') => {
    const currentIndex = form.questions.findIndex(q => q.id === questionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= form.questions.length) return;

    const newQuestions = [...form.questions];
    [newQuestions[currentIndex], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[currentIndex]];

    setForm(prev => ({
      ...prev,
      questions: newQuestions
    }));
  }, [form.questions]);

  // Add option to select/radio/checkbox questions
  const addOption = useCallback((questionId: string) => {
    const question = form.questions.find(q => q.id === questionId);
    if (!question || !question.options) return;

    updateQuestion(questionId, {
      options: [...question.options, `Option ${question.options.length + 1}`]
    });
  }, [form.questions, updateQuestion]);

  // Update option
  const updateOption = useCallback((questionId: string, optionIndex: number, value: string) => {
    const question = form.questions.find(q => q.id === questionId);
    if (!question || !question.options) return;

    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    updateQuestion(questionId, { options: newOptions });
  }, [form.questions, updateQuestion]);

  // Remove option
  const removeOption = useCallback((questionId: string, optionIndex: number) => {
    const question = form.questions.find(q => q.id === questionId);
    if (!question || !question.options || question.options.length <= 1) return;

    const newOptions = question.options.filter((_, index) => index !== optionIndex);
    updateQuestion(questionId, { options: newOptions });
  }, [form.questions, updateQuestion]);

  // Save form
  const handleSave = useCallback(() => {
    if (!form.title.trim()) {
      toast.error('Please enter a form title');
      return;
    }
    if (form.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    
    onSave?.(form);
    toast.success('Form saved successfully');
  }, [form, onSave]);

  // Preview form
  const handlePreview = useCallback(() => {
    onPreview?.(form);
  }, [form, onPreview]);

  // Render question editor
  const renderQuestionEditor = (question: FormQuestion) => {
    const config = QUESTION_TYPE_CONFIG[question.type];
    const Icon = config.icon;

    return (
      <Card 
        key={question.id}
        className={`mb-4 transition-all duration-200 ${
          selectedQuestion === question.id ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
        onClick={() => setSelectedQuestion(question.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${config.color} text-white`}>
                <Icon className="h-4 w-4" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {config.label}
              </Badge>
              {question.required && (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateQuestion(question.id);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteQuestion(question.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="cursor-move p-1">
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Question Title */}
          <div>
            <Label htmlFor={`title-${question.id}`}>Question Title</Label>
            <Input
              id={`title-${question.id}`}
              value={question.title}
              onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
              placeholder="Enter your question"
              className="mt-1"
            />
          </div>

          {/* Question Description */}
          <div>
            <Label htmlFor={`desc-${question.id}`}>Description (Optional)</Label>
            <Textarea
              id={`desc-${question.id}`}
              value={question.description || ''}
              onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
              placeholder="Add a description to help users understand this question"
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Placeholder for input fields */}
          {['text', 'textarea', 'email', 'phone', 'number'].includes(question.type) && (
            <div>
              <Label htmlFor={`placeholder-${question.id}`}>Placeholder Text</Label>
              <Input
                id={`placeholder-${question.id}`}
                value={question.placeholder || ''}
                onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                placeholder="Enter placeholder text"
                className="mt-1"
              />
            </div>
          )}

          {/* Options for select/radio/checkbox */}
          {['select', 'radio', 'checkbox'].includes(question.type) && (
            <div>
              <Label>Options</Label>
              <div className="mt-2 space-y-2">
                {question.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(question.id, index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {question.options!.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(question.id, index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(question.id)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Question Settings */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                id={`required-${question.id}`}
                checked={question.required}
                onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
              />
              <Label htmlFor={`required-${question.id}`}>Required</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render question type selector
  const renderQuestionTypeSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Add Question</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(QUESTION_TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <Button
                key={type}
                variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-2 hover:bg-primary/5"
                onClick={() => addQuestion(type as QuestionType)}
              >
                <div className={`p-2 rounded ${config.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{config.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  if (mode === 'edit') {
    return (
      <div className={`max-w-4xl mx-auto p-6 ${className}`}>
        {/* Form Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Input
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="text-2xl font-bold border-none p-0 focus:ring-0"
                  placeholder="Form Title"
                />
                <Textarea
                  value={form.description || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Form description (optional)"
                  className="mt-2 border-none p-0 focus:ring-0 resize-none"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button onClick={handleSave}>
                  Save Form
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Form Settings */}
        {showSettings && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Form Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="multiple-submissions">Allow Multiple Submissions</Label>
                <Switch
                  id="multiple-submissions"
                  checked={form.settings.allowMultipleSubmissions}
                  onCheckedChange={(checked) => 
                    setForm(prev => ({
                      ...prev,
                      settings: { ...prev.settings, allowMultipleSubmissions: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="progress-bar">Show Progress Bar</Label>
                <Switch
                  id="progress-bar"
                  checked={form.settings.showProgressBar}
                  onCheckedChange={(checked) => 
                    setForm(prev => ({
                      ...prev,
                      settings: { ...prev.settings, showProgressBar: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="collect-email">Collect Email Addresses</Label>
                <Switch
                  id="collect-email"
                  checked={form.settings.collectEmail}
                  onCheckedChange={(checked) => 
                    setForm(prev => ({
                      ...prev,
                      settings: { ...prev.settings, collectEmail: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Type Selector */}
        {renderQuestionTypeSelector()}

        {/* Questions */}
        <div className="space-y-4">
          {form.questions.map(renderQuestionEditor)}
        </div>

        {/* Empty State */}
        {form.questions.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-500 mb-4">Add your first question to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Preview/Fill mode would be implemented here
  return (
    <div className={`max-w-2xl mx-auto p-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{form.title}</CardTitle>
          {form.description && (
            <p className="text-gray-600">{form.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Preview mode coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
