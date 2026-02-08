/**
 * RecipeCreator - Shared State Demo Component
 * Demonstrates bidirectional state sync between UI and AI Agent
 */

import React, { useState } from 'react';

interface Ingredient {
    id: string;
    name: string;
    amount: string;
}

interface RecipeState {
    cookingTime: number;
    skillLevel: 'beginner' | 'intermediate' | 'expert';
    dietaryPreferences: string[];
    ingredients: Ingredient[];
    instructions: string[];
    title: string;
}

interface RecipeCreatorProps {
    initialState?: Partial<RecipeState>;
    onStateChange?: (state: RecipeState) => void;
    onImproveRequest?: (state: RecipeState) => void;
    isImproving?: boolean;
}

const defaultState: RecipeState = {
    cookingTime: 30,
    skillLevel: 'intermediate',
    dietaryPreferences: [],
    ingredients: [],
    instructions: [''],
    title: 'My Recipe'
};

const dietaryOptions = [
    'High Protein',
    'Low Carb',
    'Spicy',
    'Budget-Friendly',
    'One-Pot Meal',
    'Vegetarian',
    'Vegan',
    'Gluten-Free'
];

const RecipeCreator: React.FC<RecipeCreatorProps> = ({
    initialState,
    onStateChange,
    onImproveRequest,
    isImproving = false
}) => {
    const [recipe, setRecipe] = useState<RecipeState>({
        ...defaultState,
        ...initialState
    });

    const updateRecipe = (updates: Partial<RecipeState>) => {
        const newRecipe = { ...recipe, ...updates };
        setRecipe(newRecipe);
        onStateChange?.(newRecipe);
    };

    // External update from AI
    React.useEffect(() => {
        if (initialState) {
            setRecipe(prev => ({ ...prev, ...initialState }));
        }
    }, [initialState]);

    const addIngredient = () => {
        const newIngredient: Ingredient = {
            id: `ing-${Date.now()}`,
            name: '',
            amount: ''
        };
        updateRecipe({
            ingredients: [...recipe.ingredients, newIngredient]
        });
    };

    const updateIngredient = (id: string, field: 'name' | 'amount', value: string) => {
        updateRecipe({
            ingredients: recipe.ingredients.map(ing =>
                ing.id === id ? { ...ing, [field]: value } : ing
            )
        });
    };

    const removeIngredient = (id: string) => {
        updateRecipe({
            ingredients: recipe.ingredients.filter(ing => ing.id !== id)
        });
    };

    const addInstruction = () => {
        updateRecipe({
            instructions: [...recipe.instructions, '']
        });
    };

    const updateInstruction = (index: number, value: string) => {
        const newInstructions = [...recipe.instructions];
        newInstructions[index] = value;
        updateRecipe({ instructions: newInstructions });
    };

    const removeInstruction = (index: number) => {
        updateRecipe({
            instructions: recipe.instructions.filter((_, i) => i !== index)
        });
    };

    const toggleDietaryPref = (pref: string) => {
        const newPrefs = recipe.dietaryPreferences.includes(pref)
            ? recipe.dietaryPreferences.filter(p => p !== pref)
            : [...recipe.dietaryPreferences, pref];
        updateRecipe({ dietaryPreferences: newPrefs });
    };

    const handleImprove = () => {
        onImproveRequest?.(recipe);
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '600px',
            margin: '0 auto',
            color: 'white',
            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    value={recipe.title}
                    onChange={(e) => updateRecipe({ title: e.target.value })}
                    placeholder="Recipe Title"
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: 'white',
                        width: '100%',
                        outline: 'none'
                    }}
                />
            </div>

            {/* Time & Skill Level */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ fontSize: '12px', opacity: 0.8 }}>⏱️ Cooking Time</label>
                    <select
                        value={recipe.cookingTime}
                        onChange={(e) => updateRecipe({ cookingTime: parseInt(e.target.value) })}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px',
                            color: 'white',
                            fontSize: '14px',
                            marginTop: '4px'
                        }}
                    >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2+ hours</option>
                    </select>
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ fontSize: '12px', opacity: 0.8 }}>👨‍🍳 Skill Level</label>
                    <select
                        value={recipe.skillLevel}
                        onChange={(e) => updateRecipe({ skillLevel: e.target.value as RecipeState['skillLevel'] })}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px',
                            color: 'white',
                            fontSize: '14px',
                            marginTop: '4px'
                        }}
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="expert">Expert</option>
                    </select>
                </div>
            </div>

            {/* Dietary Preferences */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', opacity: 0.8 }}>🥗 Dietary Preferences</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {dietaryOptions.map(pref => (
                        <button
                            key={pref}
                            onClick={() => toggleDietaryPref(pref)}
                            style={{
                                background: recipe.dietaryPreferences.includes(pref)
                                    ? 'rgba(255,255,255,0.9)'
                                    : 'rgba(255,255,255,0.2)',
                                color: recipe.dietaryPreferences.includes(pref) ? '#764ba2' : 'white',
                                border: 'none',
                                borderRadius: '20px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {pref}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ingredients */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', opacity: 0.8 }}>🧅 Ingredients</label>
                    <button
                        onClick={addIngredient}
                        style={{
                            background: 'rgba(255,255,255,0.3)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '4px 12px',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        + Add
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recipe.ingredients.map((ing) => (
                        <div key={ing.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={ing.name}
                                onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                                placeholder="Ingredient"
                                style={{
                                    flex: 2,
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                            <input
                                type="text"
                                value={ing.amount}
                                onChange={(e) => updateIngredient(ing.id, 'amount', e.target.value)}
                                placeholder="Amount"
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                            <button
                                onClick={() => removeIngredient(ing.id)}
                                style={{
                                    background: 'rgba(255,100,100,0.4)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {recipe.ingredients.length === 0 && (
                        <p style={{ opacity: 0.6, fontSize: '14px', textAlign: 'center', padding: '12px' }}>
                            No ingredients yet. Click "+ Add" to add some!
                        </p>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', opacity: 0.8 }}>📝 Instructions</label>
                    <button
                        onClick={addInstruction}
                        style={{
                            background: 'rgba(255,255,255,0.3)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '4px 12px',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        + Add Step
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recipe.instructions.map((inst, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{
                                background: '#ff6b35',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                flexShrink: 0,
                                marginTop: '8px'
                            }}>
                                {index + 1}
                            </span>
                            <textarea
                                value={inst}
                                onChange={(e) => updateInstruction(index, e.target.value)}
                                placeholder={`Step ${index + 1}...`}
                                rows={2}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    color: 'white',
                                    fontSize: '14px',
                                    resize: 'vertical'
                                }}
                            />
                            <button
                                onClick={() => removeInstruction(index)}
                                style={{
                                    background: 'rgba(255,100,100,0.4)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    marginTop: '8px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {recipe.instructions.length === 0 && (
                        <p style={{ opacity: 0.6, fontSize: '14px', textAlign: 'center', padding: '12px' }}>
                            No instructions yet. Click "+ Add Step" to add some!
                        </p>
                    )}
                </div>
            </div>

            {/* Improve Button */}
            <button
                onClick={handleImprove}
                disabled={isImproving}
                style={{
                    width: '100%',
                    background: isImproving
                        ? 'rgba(255,255,255,0.3)'
                        : 'linear-gradient(135deg, #ff6b35 0%, #ff9f1c 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: isImproving ? 'wait' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: isImproving ? 'none' : '0 4px 15px rgba(255, 107, 53, 0.4)'
                }}
            >
                {isImproving ? '✨ Improving...' : '🪄 Improve with AI'}
            </button>

            {/* State Indicator */}
            <div style={{
                marginTop: '12px',
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '11px',
                opacity: 0.7,
                textAlign: 'center'
            }}>
                🔄 Shared State Active | {recipe.ingredients.length} ingredients | {recipe.instructions.filter(i => i).length} steps
            </div>
        </div>
    );
};

export default RecipeCreator;
