/**
 * FormInput Component
 * Provides structured form inputs (text, dropdowns, checkboxes) for chat messages
 */

import { useState, useCallback } from 'react';

export interface FormData {
    textFields: Record<string, string>;
    dropdowns: Record<string, string>;
    checkboxes: Record<string, boolean>;
}

interface FormInputProps {
    onFormDataChange: (data: FormData) => void;
    onClose: () => void;
    disabled?: boolean;
}

const INITIAL_FORM_DATA: FormData = {
    textFields: {
        name: '',
        subject: '',
        details: ''
    },
    dropdowns: {
        priority: 'medium',
        category: 'general'
    },
    checkboxes: {
        urgent: false,
        needsFollowUp: false,
        confidential: false
    }
};

function FormInput({ onFormDataChange, onClose, disabled = false }: FormInputProps) {
    const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

    const handleTextChange = useCallback((field: string, value: string) => {
        setFormData(prev => {
            const newData = {
                ...prev,
                textFields: { ...prev.textFields, [field]: value }
            };
            onFormDataChange(newData);
            return newData;
        });
    }, [onFormDataChange]);

    const handleDropdownChange = useCallback((field: string, value: string) => {
        setFormData(prev => {
            const newData = {
                ...prev,
                dropdowns: { ...prev.dropdowns, [field]: value }
            };
            onFormDataChange(newData);
            return newData;
        });
    }, [onFormDataChange]);

    const handleCheckboxChange = useCallback((field: string, checked: boolean) => {
        setFormData(prev => {
            const newData = {
                ...prev,
                checkboxes: { ...prev.checkboxes, [field]: checked }
            };
            onFormDataChange(newData);
            return newData;
        });
    }, [onFormDataChange]);

    const clearForm = useCallback(() => {
        setFormData(INITIAL_FORM_DATA);
        onFormDataChange(INITIAL_FORM_DATA);
    }, [onFormDataChange]);

    return (
        <div className="glass rounded-xl p-4 mb-3 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <span>📋</span> Structured Form Data
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={clearForm}
                        className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
                        disabled={disabled}
                    >
                        Clear
                    </button>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Text Fields */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Name</label>
                        <input
                            type="text"
                            value={formData.textFields.name}
                            onChange={(e) => handleTextChange('name', e.target.value)}
                            placeholder="Enter name..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                            disabled={disabled}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Subject</label>
                        <input
                            type="text"
                            value={formData.textFields.subject}
                            onChange={(e) => handleTextChange('subject', e.target.value)}
                            placeholder="Enter subject..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                            disabled={disabled}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Additional Details</label>
                        <textarea
                            value={formData.textFields.details}
                            onChange={(e) => handleTextChange('details', e.target.value)}
                            placeholder="Any additional details..."
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                            disabled={disabled}
                        />
                    </div>
                </div>

                {/* Dropdowns and Checkboxes */}
                <div className="space-y-3">
                    {/* Dropdowns */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Priority</label>
                        <select
                            value={formData.dropdowns.priority}
                            onChange={(e) => handleDropdownChange('priority', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                            disabled={disabled}
                        >
                            <option value="low" className="bg-gray-800">Low</option>
                            <option value="medium" className="bg-gray-800">Medium</option>
                            <option value="high" className="bg-gray-800">High</option>
                            <option value="critical" className="bg-gray-800">Critical</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Category</label>
                        <select
                            value={formData.dropdowns.category}
                            onChange={(e) => handleDropdownChange('category', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                            disabled={disabled}
                        >
                            <option value="general" className="bg-gray-800">General</option>
                            <option value="technical" className="bg-gray-800">Technical</option>
                            <option value="billing" className="bg-gray-800">Billing</option>
                            <option value="feature" className="bg-gray-800">Feature Request</option>
                            <option value="bug" className="bg-gray-800">Bug Report</option>
                        </select>
                    </div>

                    {/* Checkboxes */}
                    <div className="pt-2">
                        <label className="block text-xs text-gray-400 mb-2">Options</label>
                        <div className="space-y-2">
                            {[
                                { key: 'urgent', label: '🚨 Urgent' },
                                { key: 'needsFollowUp', label: '📞 Needs Follow-up' },
                                { key: 'confidential', label: '🔒 Confidential' }
                            ].map(({ key, label }) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-2 cursor-pointer group"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.checkboxes[key]}
                                        onChange={(e) => handleCheckboxChange(key, e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
                                        disabled={disabled}
                                    />
                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                        {label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Data Preview */}
            {(Object.values(formData.textFields).some(v => v) ||
                Object.values(formData.checkboxes).some(v => v)) && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                        <p className="text-xs text-gray-500 mb-2">📤 Data to be sent with message:</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {formData.textFields.name && (
                                <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                                    Name: {formData.textFields.name}
                                </span>
                            )}
                            {formData.textFields.subject && (
                                <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                                    Subject: {formData.textFields.subject}
                                </span>
                            )}
                            <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                                Priority: {formData.dropdowns.priority}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                                Category: {formData.dropdowns.category}
                            </span>
                            {formData.checkboxes.urgent && (
                                <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-300">🚨 Urgent</span>
                            )}
                            {formData.checkboxes.needsFollowUp && (
                                <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300">📞 Follow-up</span>
                            )}
                            {formData.checkboxes.confidential && (
                                <span className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-300">🔒 Confidential</span>
                            )}
                        </div>
                    </div>
                )}
        </div>
    );
}

export default FormInput;
