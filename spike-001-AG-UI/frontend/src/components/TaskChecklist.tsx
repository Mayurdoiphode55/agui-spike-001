import React, { useState } from 'react';

interface Task {
    id: string;
    label: string;
    checked: boolean;
}

interface TaskChecklistProps {
    data: {
        title: string;
        tasks: Task[];
    };
    onConfirm?: (selectedTasks: Task[]) => void;
    onReject?: () => void;
}

const TaskChecklist: React.FC<TaskChecklistProps> = ({ data, onConfirm, onReject }) => {
    const [tasks, setTasks] = useState<Task[]>(data.tasks);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleToggle = (id: string) => {
        if (isSubmitted) return;
        setTasks(prev => prev.map(t =>
            t.id === id ? { ...t, checked: !t.checked } : t
        ));
    };

    const handleConfirm = () => {
        setIsSubmitted(true);
        if (onConfirm) {
            onConfirm(tasks.filter(t => t.checked));
        }

        const event = new CustomEvent('agui-action', {
            detail: {
                action: 'sendMessage',
                content: `Plan approved! Selected steps: ${tasks.filter(t => t.checked).map(t => t.label).join(', ')}`
            }
        });
        window.dispatchEvent(event);
    };

    const handleReject = () => {
        setIsSubmitted(true);
        if (onReject) {
            onReject();
        }

        const event = new CustomEvent('agui-action', {
            detail: {
                action: 'sendMessage',
                content: "I reject this plan. Please revise it."
            }
        });
        window.dispatchEvent(event);
    };

    const selectedCount = tasks.filter(t => t.checked).length;

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 font-sans">
            <div className="bg-primary-600 px-6 py-4">
                <h3 className="text-lg font-bold text-white">{data.title}</h3>
                <p className="text-primary-100 text-sm">Select steps to approve</p>
            </div>

            <div className="p-4 space-y-3 bg-gray-50">
                <div className="flex justify-between items-center text-xs text-gray-500 font-medium px-2">
                    <span className="text-primary-600 font-bold">Select Steps</span>
                    <span>{selectedCount}/{tasks.length} Selected</span>
                </div>

                <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary-500 transition-all duration-300"
                        style={{ width: `${(selectedCount / tasks.length) * 100}%` }}
                    />
                </div>

                <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-1">
                    {tasks.map(task => (
                        <div
                            key={task.id}
                            onClick={() => handleToggle(task.id)}
                            className={`
                                flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                ${task.checked
                                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                                    : 'bg-white border-gray-100 hover:bg-gray-50'}
                                ${isSubmitted ? 'opacity-75 cursor-not-allowed' : ''}
                            `}
                        >
                            <div className={`
                                w-5 h-5 rounded-md flex items-center justify-center border transition-colors
                                ${task.checked
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white border-gray-300'}
                            `}>
                                {task.checked && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className={`text-sm ${task.checked ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                {task.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <button
                    onClick={handleReject}
                    disabled={isSubmitted}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                    Reject
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={isSubmitted || selectedCount === 0}
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 text-sm font-medium transition-colors shadow-lg shadow-gray-200 disabled:opacity-50"
                >
                    {isSubmitted ? 'Submitted' : 'Confirm Plan'}
                </button>
            </div>
        </div>
    );
};

export default TaskChecklist;
