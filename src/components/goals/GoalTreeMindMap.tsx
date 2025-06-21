import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Text,
    Platform,
    Alert,
    I18nManager,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import '../../utils/i18n'
import { useTranslation } from "react-i18next";

import GoalNodeMindMap, { NODE_WIDTH, NODE_BASE_HEIGHT, NODE_VERTICAL_SPACING, NODE_HORIZONTAL_SPACING, } from "./GoalNodeMindMap";
// Re-add HabitNodeMindMap import for rendering habits as nodes
import HabitNodeMindMap, { HABIT_NODE_HEIGHT, HABIT_NODE_WIDTH } from "./HabitNodeMindMap";
import { Goal, NodeLayout, Habit } from "@/types/index";
import { useAppDispatch, useAppState } from "@/context/AppStateContext";
import {getColors}  from "@/constants/Colors";
import SelectHabitModal from "../SelectHabitModal";
import { router } from "expo-router";
import { format } from "date-fns";
let Colors = getColors()

// Simple node layout interface
interface ExtendedNodeLayout extends NodeLayout {
    goalData: Goal;
    isHabitNode?: boolean;
    habitData?: Habit;
}

// Existing interface
interface GoalTreeMindMapProps {
    onAddGoal: (parentGoalId: string | null) => void;
    onEditGoal: (goalId: string, newTitle: string, newColor: string) => void;
    onRemoveGoal: (goalId: string) => void;
}

const GoalTreeMindMap: React.FC<GoalTreeMindMapProps> = ({
    onAddGoal,
    onEditGoal,
    onRemoveGoal,
}) => {
    const { goals, habits, settings } = useAppState();
    Colors = getColors(settings.theme)
    const dispatch = useAppDispatch();

    // Update state to use simplified ExtendedNodeLayout
    const [nodeLayouts, setNodeLayouts] = useState<Map<string, ExtendedNodeLayout>>(
        new Map()
    );
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [showHabitModal, setShowHabitModal] = useState(false);
    const { t } = useTranslation();

    // --- Reanimated Shared Values ---
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    // --- Layout Calculation ---
    // Remove getGoalType function as it's no longer needed

    // Helper function to get subgoals from the flat structure
    const getSubgoals = useCallback((goalId: string): Goal[] => {
        const goal = goals.find((g:Goal) => g.id === goalId);
        if (!goal || !goal.subgoals || goal.subgoals.length === 0) {
            return [];
        }
        return goal.subgoals
            .map((subgoalId:string) => goals.find((g:Goal) => g.id === subgoalId))
            .filter(Boolean) as Goal[];
    }, [goals]);

    // Modified calculateLayout function for flat goals structure
    const calculateLayout = useCallback(
        (
            goalIds: string[],
            parentId: string | null,
            startY: number,
            level: number
        ): {
            layouts: Map<string, ExtendedNodeLayout>;
            totalWidth: number;
            maxY: number;
        } => {
            const currentLevelLayouts = new Map<string, ExtendedNodeLayout>();
            let cumulativeMaxY = startY + NODE_BASE_HEIGHT;
            let groupRequiredWidth = 0;

            // Get actual goal objects from their IDs
            const goalData = goalIds
                .map(id => goals.find((g:Goal) => g.id === id))
                .filter(Boolean) as Goal[];

            const childrenResults = goalData.map((goal) => {
                const nodeWidth = NODE_WIDTH;
                const nodeHeight = NODE_BASE_HEIGHT;
                const hasSubgoals = goal.subgoals && goal.subgoals.length > 0;
                const hasHabits = goal.habitsIds && goal.habitsIds.length > 0;
                
                // Process goal based on its content (subgoals vs habits)
                if (hasSubgoals) {
                    // Process subgoals using IDs instead of direct objects
                    const childrenY = startY + nodeHeight + NODE_VERTICAL_SPACING;
                    const subgoalIds = goal.subgoals!;
                    
                    const subResult = calculateLayout(
                        subgoalIds,
                        goal.id,
                        childrenY,
                        level + 1
                    );
                    const requiredWidth = Math.max(nodeWidth, subResult.totalWidth);
                    cumulativeMaxY = Math.max(cumulativeMaxY, subResult.maxY);
                    return { 
                        goal, 
                        nodeWidth, 
                        nodeHeight, 
                        requiredWidth, 
                        subResult,
                        hasHabits: false // Not showing habits for goals with subgoals
                    };
                } 
                else if (hasHabits) {
                    // NEW: Process habits as nodes if there are no subgoals
                    const habitsArray = goal.habitsIds?.map(id => habits.find((h:Habit) => h.id === id))
                        .filter(Boolean) as Habit[] || [];
                        
                    // Calculate layout for habit nodes
                    const childrenY = startY + nodeHeight + NODE_VERTICAL_SPACING;
                    
                    // Create a mini-layout for habits
                    let habitLayouts = new Map<string, ExtendedNodeLayout>();
                    let totalHabitsWidth = 0;
                    let habitMaxY = childrenY + HABIT_NODE_HEIGHT;
                    
                    // Position each habit horizontally
                    let habitX = 0;
                    habitsArray.forEach((habit) => {
                        const habitNodeWidth = HABIT_NODE_WIDTH;
                        
                        habitLayouts.set(`habit-${habit.id}`, {
                            id: `habit-${habit.id}`,
                            x: habitX,
                            y: childrenY,
                            width: habitNodeWidth,
                            height: HABIT_NODE_HEIGHT,
                            parentId: goal.id,
                            goalData: goal,
                            isHabitNode: true,
                            habitData: habit
                        });
                        
                        habitX += habitNodeWidth + NODE_HORIZONTAL_SPACING/2;
                    });
                    
                    totalHabitsWidth = habitX - NODE_HORIZONTAL_SPACING/2;
                    const requiredWidth = Math.max(nodeWidth, totalHabitsWidth);
                    
                    return {
                        goal,
                        nodeWidth,
                        nodeHeight,
                        requiredWidth,
                        subResult: {
                            layouts: habitLayouts,
                            totalWidth: totalHabitsWidth,
                            maxY: habitMaxY
                        },
                        hasHabits: true
                    };
                }
                else {
                    // Empty goal (no subgoals or habits)
                    return { 
                        goal, 
                        nodeWidth, 
                        nodeHeight, 
                        requiredWidth: nodeWidth, 
                        subResult: { 
                            layouts: new Map<string, ExtendedNodeLayout>(), 
                            totalWidth: 0, 
                            maxY: startY + nodeHeight 
                        },
                        hasHabits: false
                    };
                }
            });

            // Calculate group width
            groupRequiredWidth = childrenResults.reduce((acc, result, index) => {
                return (
                    acc + result.requiredWidth + (index > 0 ? NODE_HORIZONTAL_SPACING : 0)
                );
            }, 0);

            let currentX = 0;
            childrenResults.forEach(
                ({ goal, nodeWidth, nodeHeight, requiredWidth, subResult, hasHabits }) => {
                    const blockStartX = currentX;
                    const nodeX = blockStartX + requiredWidth / 2 - nodeWidth / 2;

                    // Add the goal node
                    const layout: ExtendedNodeLayout = {
                        id: goal.id,
                        x: nodeX,
                        y: startY,
                        width: nodeWidth,
                        height: nodeHeight,
                        parentId: parentId,
                        goalData: goal,
                    };
                    currentLevelLayouts.set(goal.id, layout);

                    // Add child layouts (subgoals or habits)
                    const childGroupLayouts = subResult.layouts;
                    const childGroupWidth = subResult.totalWidth;
                    
                    // Center the child nodes beneath the parent
                    const childGroupStartX = layout.x + nodeWidth / 2 - childGroupWidth / 2;
                    
                    childGroupLayouts.forEach((childLayout) => {
                        // Adjust position relative to parent
                        childLayout.x += childGroupStartX;
                        currentLevelLayouts.set(childLayout.id, childLayout);
                    });

                    // Update max Y based on this branch
                    cumulativeMaxY = Math.max(cumulativeMaxY, subResult.maxY);
                    
                    currentX = blockStartX + requiredWidth + NODE_HORIZONTAL_SPACING;
                }
            );

            return {
                layouts: currentLevelLayouts,
                totalWidth: groupRequiredWidth,
                maxY: cumulativeMaxY,
            };
        },
        [goals, habits] // Add goals to dependency array
    );

    // --- Effect to Recalculate Layout ---
    useEffect(() => {
        // Handle empty goals case
        if (!goals || goals.length === 0) {
            setNodeLayouts(new Map());
            setCanvasSize({ width: Dimensions.get("window").width, height: 200 });
            setFocusedNodeId(null);
            setEditingNodeId(null);
            // Also reset transforms if goals become empty
            scale.value = 1; // Using direct assignment is okay for reset
            translateX.value = 0;
            translateY.value = 0;
            savedScale.value = 1;
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            return;
        }

        // --- Layout Calculation Logic ---
        const initialY = 50;
        const rootGoals = goals.filter((goal:Goal) => {
            // A root goal is not referenced as a subgoal in any other goal
            return !goals.some((g:Goal) => 
                g.subgoals && g.subgoals.includes(goal.id)
            );
        });
        
        // Get root goal IDs for the layout calculation
        const rootGoalIds = rootGoals.map((g:Goal) => g.id);
        
        const { layouts, totalWidth, maxY } = calculateLayout(
            rootGoalIds,
            null,
            initialY,
            0
        );

        const screenWidth = Dimensions.get("window").width;
        const finalTreeWidth = totalWidth;
        const centeringOffset = Math.max(50, (screenWidth - finalTreeWidth) / 2);

        const finalLayouts = new Map<string, ExtendedNodeLayout>();
        layouts.forEach((layout) => {
            finalLayouts.set(layout.id, { ...layout, x: layout.x + centeringOffset });
        });

        setNodeLayouts(finalLayouts); // Update node positions

        // --- Canvas Size Calculation ---
        const requiredWidth = finalTreeWidth + centeringOffset * 2;
        const requiredHeight = maxY + 100;
        setCanvasSize({
            width: Math.max(screenWidth, requiredWidth),
            height: requiredHeight,
        }); // Update canvas size

        // Reset interaction state only
        setFocusedNodeId(null);
        setEditingNodeId(null);
    }, [goals, calculateLayout]);

    // --- handleNodeLayoutMeasured ---
    const handleNodeLayoutMeasured = useCallback(
        (id: string, width: number, height: number) => {
            setNodeLayouts((prevLayouts) => {
                const currentLayout = prevLayouts.get(id);
                if (currentLayout && currentLayout.height !== height) {
                    const newLayouts = new Map(prevLayouts);
                    newLayouts.set(id, { ...currentLayout, height: height });
                    return newLayouts;
                }
                return prevLayouts;
            });
        },
        []
    );

    // Updated renderLines to handle habit nodes
    const renderLines = useMemo(() => {
        const lines: React.ReactNode[] = [];
        nodeLayouts.forEach((childLayout) => {
            if (childLayout.parentId) {
                const parentLayout = nodeLayouts.get(childLayout.parentId);
                if (parentLayout) {
                    const x1 = parentLayout.x + parentLayout.width / 2;
                    const y1 = parentLayout.y + parentLayout.height;
                    const x2 = childLayout.x + childLayout.width / 2;
                    const y2 = childLayout.y;

                    // Adjust line appearance for habit connections
                    const isHabitConnection = childLayout.isHabitNode === true;
                    const lineColor = isHabitConnection ? "#aaa" : "#888";
                    const lineStroke = isHabitConnection ? "1" : "1.5"; // Thinner for habits
                    const lineDash = isHabitConnection ? "4,2" : undefined; // Dashed for habits

                    // Adjust curve for habit connections
                    const verticalDifference = Math.abs(y2 - y1);
                    const curveFactor = isHabitConnection ? 0.3 : 0.4; // Less curve for habits
                    const c1x = x1;
                    const c1y = y1 + verticalDifference * curveFactor;
                    const c2x = x2;
                    const c2y = y2 - verticalDifference * curveFactor;
                    const pathData = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;

                    lines.push(
                        <Path
                            key={`${parentLayout.id}-${childLayout.id}`}
                            d={pathData}
                            stroke={lineColor}
                            strokeWidth={lineStroke}
                            strokeDasharray={lineDash}
                            fill="none"
                        />
                    );
                }
            }
        });
        return lines;
    }, [nodeLayouts]);

    // --- Callbacks for Focus & Edit State & Actions ---
    const handleNodeFocus = useCallback((id: string) => {
        // Ignore clicks on habit nodes for focusing
        if (id.startsWith('habit-')) return;
        
        setFocusedNodeId((currentId) => {
            if (currentId !== id) {
                setEditingNodeId(null);
                return id;
            }
            return currentId;
        });
    }, []);

    const unfocusAndStopEditingJS = useCallback(() => {
        setFocusedNodeId(null);
        setEditingNodeId(null);
    }, []);

    const handleEditComplete = useCallback(() => {
        setEditingNodeId(null);
    }, []);

    const handleToggleEdit = useCallback(() => {
        if (editingNodeId) {
            setEditingNodeId(null);
        } else if (focusedNodeId) {
            setEditingNodeId(focusedNodeId);
        }
    }, [focusedNodeId, editingNodeId]);

    const handleGoalEdited = useCallback(
        (goalId: string, newTitle: string, newColor: string) => {
            onEditGoal(goalId, newTitle, newColor);
            handleEditComplete();
        },
        [onEditGoal, handleEditComplete]
    );

    // Also ensure handleToggleGoalEnabled is defined
    const handleToggleGoalEnabled = useCallback(() => {
        if (focusedNodeId) {
            const focusedGoalData = nodeLayouts.get(focusedNodeId)?.goalData;
            if (focusedGoalData) {
                // Toggle to opposite of current state
                const newEnabledState = !(focusedGoalData.enabled);
                
                // Dispatch action to update the goal and its children
                dispatch({
                    type: 'TOGGLE_GOAL_ENABLED',
                    payload: {
                        goalId: focusedNodeId,
                        enabled: newEnabledState
                    }
                });
            }
        }
    }, [focusedNodeId, nodeLayouts, dispatch]);

    // Add the missing handler for removing focused goal
    const handleRemoveFocusedGoal = useCallback(() => {
        if (focusedNodeId) {
            const nodeToRemove = nodeLayouts.get(focusedNodeId)?.goalData;
            if (!nodeToRemove) return;

            Alert.alert(
                t('goals.deleteAlert.title'),
                `${t('goals.deleteAlert.message1')} "${nodeToRemove.title}"${t('questionMark')} ${t('goals.deleteAlert.message2')}`,
                [
                    { text: t('goals.deleteAlert.cancelButton'), style: "cancel" },
                    {
                        text: t('goals.deleteAlert.confirmButton'),
                        style: "destructive",
                        onPress: () => {
                            onRemoveGoal(focusedNodeId);
                            setFocusedNodeId(null);
                            setEditingNodeId(null);
                        },
                    },
                ]
            );
        }
    }, [focusedNodeId, onRemoveGoal, nodeLayouts]);

    // Simplify handleAddSubgoalToFocused without node type checking
    const handleAddButtonPressed = useCallback(() => {
        if (focusedNodeId) {
            const focusedGoalData = nodeLayouts.get(focusedNodeId)?.goalData;
            if (!focusedGoalData) return;
            
            const hasHabits = focusedGoalData.habitsIds && focusedGoalData.habitsIds.length > 0;
            const hasSubgoals = focusedGoalData.subgoals && focusedGoalData.subgoals.length > 0;
            
            if (hasHabits) {
                // If it already has habits, directly show the habit selection modal
                setShowHabitModal(true);
            } else if (hasSubgoals) {
                // If it has subgoals, directly add another subgoal
                onAddGoal(focusedNodeId);
            } else {
                // If it has neither, show options to choose
                Alert.alert(
                    "Add to Goal",
                    "What would you like to add to this goal?",
                    [
                        {
                            text: "Cancel",
                            style: "cancel"
                        },
                        {
                            text: "Habit",
                            onPress: () => setShowHabitModal(true)
                        },
                        {
                            text: "Subgoal",
                            onPress: () => onAddGoal(focusedNodeId)
                        },
                    ]
                );
            }
        }
    }, [focusedNodeId, nodeLayouts, onAddGoal]);

    const handleHabitModalClose = useCallback(() => {
        setShowHabitModal(false);
    }, []);

    // Update renderNodes to include habit nodes
    const renderNodes = useMemo(() => {
        const nodes: React.ReactNode[] = [];
        nodeLayouts.forEach((layout) => {
            if (layout.isHabitNode && layout.habitData) {
                // Render habit node
                nodes.push(
                    <HabitNodeMindMap
                        key={layout.id}
                        id={layout.id}
                        x={layout.x}
                        y={layout.y}
                        width={layout.width}
                        height={layout.height}
                        habit={layout.habitData}
                        onPress={() => {}} // Habits aren't clickable in this view
                    />
                );
            } else {
                // Render goal node
                nodes.push(
                    <GoalNodeMindMap
                        key={layout.id}
                        nodeLayout={layout}
                        isFocused={layout.id === focusedNodeId}
                        isEditing={layout.id === editingNodeId}
                        onLayoutMeasured={handleNodeLayoutMeasured}
                        onFocus={handleNodeFocus}
                        onEditGoal={handleGoalEdited}
                        onEditCancel={handleEditComplete}
                    />
                );
            }
        });
        return nodes;
    }, [
        nodeLayouts,
        focusedNodeId,
        editingNodeId,
        handleNodeLayoutMeasured,
        handleNodeFocus,
        handleGoalEdited,
        handleEditComplete,
    ]);

    // --- Define Gestures ---
    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((event) => {
            const newScale = savedScale.value * event.scale;
            scale.value = Math.max(0.5, Math.min(newScale, 3.0));
        });

    const panGesture = Gesture.Pan()
        .minDistance(10)
        .onStart(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        })
        .onUpdate((event) => {
            translateX.value = savedTranslateX.value + event.translationX;
            translateY.value = savedTranslateY.value + event.translationY;
        });

    const tapGesture = Gesture.Tap()
        .maxDuration(250)
        .onEnd(() => {
            runOnJS(unfocusAndStopEditingJS)();
        });

    const composedGesture = Gesture.Simultaneous(
        pinchGesture,
        panGesture,
        tapGesture
    );

    // --- Animated Style ---
    const animatedCanvasStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    // --- Determine Action Panel Button States ---
    // Update to remove habit-related checks
    const focusedGoalData = focusedNodeId
        ? nodeLayouts.get(focusedNodeId)?.goalData
        : null;

    const canAddSubgoal = !!focusedGoalData;
    const isCurrentlyEditing = editingNodeId === focusedNodeId;
    const isPaused = focusedGoalData && focusedGoalData.enabled === false;

    // --- Component Return JSX ---
    return (
        <View style={[styles.container, { direction: 'ltr' }]}>
            <GestureDetector gesture={composedGesture}>
                <View style={[styles.gestureArea, { direction: 'ltr' }]}>
                    <Animated.View style={[animatedCanvasStyle, { direction: 'ltr' }]}>
                        <View
                            style={[
                                styles.canvas,
                                { width: canvasSize.width, height: canvasSize.height, direction: 'ltr' },
                            ]}
                        >
                            <Svg
                                width="100%"
                                height="100%"
                                style={StyleSheet.absoluteFill}
                                pointerEvents='none'
                            >
                                {renderLines}
                            </Svg>
                            {renderNodes}
                        </View>
                    </Animated.View>
                </View>
            </GestureDetector>

            {/* Unified Floating Action Panel */}
            {focusedNodeId && (
                <View style={styles.floatingActionPanel}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleAddButtonPressed}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={((focusedGoalData?.habitsIds||[]).length === 0)? 'add':'git-branch-outline'}
                            size={22}
                            color={Colors.grey}
                        />
                        <Text style={styles.actionText}>
                            {((focusedGoalData?.habitsIds||[]).length === 0)? t('goals.add'):t('goals.modifyStructure')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleToggleEdit}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isCurrentlyEditing ? "checkmark-done" : "pencil"}
                            size={20}
                            color={Colors.grey}
                        />
                        <Text style={styles.actionText}>
                            {isCurrentlyEditing ? t('goals.done') : t('goals.edit')}
                        </Text>
                    </TouchableOpacity>

                    {/* Pause/resume button */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleToggleGoalEnabled}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isPaused ? "play" : "pause"}
                            size={20}
                            color={Colors.grey}
                        />
                        <Text style={styles.actionText}>
                            {isPaused ? t('goals.resume') : t('goals.pause')}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleRemoveFocusedGoal}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="trash-outline" size={20} color={Colors.red} />
                        <Text style={[styles.actionText, styles.deleteText]}>{t('goals.delete')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Keep habit modal for linking habits to goals */}
            {showHabitModal && focusedNodeId && nodeLayouts.get(focusedNodeId) && (
                <SelectHabitModal
                    goal={nodeLayouts.get(focusedNodeId)!.goalData}
                    visible={true}
                    onClose={handleHabitModalClose}
                />
            )}

            {/* Remove habit edit modal */}
        </View>
    );
};

const styles = StyleSheet.create({
    // Remove habit-specific styles
    container: {
        flex: 1,
        position: "relative",
        direction: 'ltr', // Force LTR layout
    },
    gestureArea: {
        flex: 1,
        overflow: "hidden",
        backgroundColor: Colors.background,
        direction: 'ltr', // Force LTR layout
    },
    canvas: {
        position: "relative",
        backgroundColor: "transparent",
        direction: 'ltr', // Force LTR layout
    },
    floatingActionPanel: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 35 : 25,
        alignSelf: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 8,
        shadowColor: Colors.background,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 4,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    actionDivider: {
        width: 1,
        height: "70%",
        backgroundColor: Colors.surface,
    },
    actionText: {
        fontSize: 14,
        fontWeight: "500",
        marginLeft: 5,
        color: Colors.text,
    },
    disabledText: {
        color: Colors.darkGrey,
    },
    deleteText: {
        color: Colors.red,
    },
});

export default GoalTreeMindMap;
