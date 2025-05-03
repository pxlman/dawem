// src/components/GoalTreeMindMap.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Text,
    Platform,
    Alert,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming, // Keep withTiming if you might use it elsewhere
    runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import GoalNodeMindMap, { NODE_WIDTH, NODE_BASE_HEIGHT, NODE_VERTICAL_SPACING, NODE_HORIZONTAL_SPACING, } from "./GoalNodeMindMap";
import HabitNodeMindMap  from "./HabitNodeMindMap";
import { Goal, NodeLayout, Habit } from "../../types";
import { useAppDispatch, useAppState } from "@/context/AppStateContext";
import Colors from "@/constants/Colors";
import SelectHabitModal from "../SelectHabitModal";
import HabitEditModal from "../HabitEditModal";

// Define a new type to distinguish between goal and habit nodes
type NodeType = 'goal' | 'habit';

// Extend NodeLayout to include node type and conditionally require either goalData or habitData
interface ExtendedNodeLayout extends Omit<NodeLayout, 'goalData'> {
    nodeType: NodeType;
    goalData?: Goal;
    habitData?: Habit;
}

// Existing interface
interface GoalTreeMindMapProps {
    onAddGoal: (parentGoalId: string | null) => void;
    onEditGoal: (goalId: string, newTitle: string, newColor: string) => void;
    onRemoveGoal: (goalId: string) => void;
}

const HABIT_NODE_HEIGHT = NODE_BASE_HEIGHT * 0.8; // Slightly smaller than goal nodes
const HABIT_NODE_WIDTH = NODE_WIDTH * 0.9;

const GoalTreeMindMap: React.FC<GoalTreeMindMapProps> = ({
    onAddGoal,
    onEditGoal,
    onRemoveGoal,
}) => {
    const { goals, habits, timeModules } = useAppState();
    const dispatch = useAppDispatch();

    // Update state type to use ExtendedNodeLayout
    const [nodeLayouts, setNodeLayouts] = useState<Map<string, ExtendedNodeLayout>>(
        new Map()
    );
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [showHabitModal, setShowHabitModal] = useState(false);
    const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

    // --- Reanimated Shared Values ---
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    // --- Layout Calculation ---
    // Modified calculateLayout function to include habits
    const calculateLayout = useCallback(
        (
            goalData: Goal[],
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

            const childrenResults = goalData.map((goal) => {
                const nodeWidth = NODE_WIDTH;
                const nodeHeight = NODE_BASE_HEIGHT;
                
                // Check if this goal has subgoals
                if (goal.subgoals && goal.subgoals.length > 0) {
                    // Process subgoals as usual
                    const childrenY = startY + nodeHeight + NODE_VERTICAL_SPACING;
                    const subResult = calculateLayout(
                        goal.subgoals,
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
                        hasHabits: false 
                    };
                } 
                // Check if the goal has habits
                else if (goal.habitsIds && goal.habitsIds.length > 0) {
                    // Find the associated habits
                    const goalHabits = habits.filter(h => goal.habitsIds?.includes(h.id));
                    
                    if (goalHabits.length === 0) {
                        // No actual habits found, treat as a regular node
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
                    
                    // Create layouts for habits
                    const habitLayouts = new Map<string, ExtendedNodeLayout>();
                    const habitY = startY + nodeHeight + NODE_VERTICAL_SPACING;
                    
                    // Calculate total width needed for all habits
                    const habitsTotalWidth = goalHabits.length * HABIT_NODE_WIDTH + 
                                            (goalHabits.length - 1) * NODE_HORIZONTAL_SPACING;
                    
                    // Position each habit
                    let currentHabitX = -(habitsTotalWidth / 2) + (HABIT_NODE_WIDTH / 2);
                    
                    // When creating habit layout objects, pass the parent goal's enabled state
                    goalHabits.forEach(habit => {
                        const habitNodeId = `habit-${habit.id}`;
                        habitLayouts.set(habitNodeId, {
                            id: habitNodeId,
                            x: currentHabitX,
                            y: habitY,
                            width: HABIT_NODE_WIDTH,
                            height: HABIT_NODE_HEIGHT,
                            parentId: goal.id,
                            nodeType: 'habit',
                            habitData: {
                                ...habit,
                                parentGoalEnabled: goal.enabled // Pass parent goal's enabled state
                            }
                        });
                        
                        currentHabitX += HABIT_NODE_WIDTH + NODE_HORIZONTAL_SPACING;
                    });
                    
                    const requiredWidth = Math.max(nodeWidth, habitsTotalWidth);
                    cumulativeMaxY = Math.max(cumulativeMaxY, habitY + HABIT_NODE_HEIGHT);
                    
                    return {
                        goal,
                        nodeWidth,
                        nodeHeight,
                        requiredWidth,
                        subResult: {
                            layouts: habitLayouts,
                            totalWidth: habitsTotalWidth,
                            maxY: habitY + HABIT_NODE_HEIGHT
                        },
                        hasHabits: true
                    };
                }
                else {
                    // No subgoals or habits
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

            // ... existing group width calculation ...
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
                        nodeType: 'goal'
                    };
                    currentLevelLayouts.set(goal.id, layout);

                    // Add child layouts (either subgoals or habits)
                    const childGroupLayouts = subResult.layouts;
                    const childGroupWidth = subResult.totalWidth;
                    
                    // Center the child nodes beneath the parent
                    const childGroupStartX = hasHabits 
                        ? layout.x + nodeWidth / 2 
                        : layout.x + nodeWidth / 2 - childGroupWidth / 2;
                    
                    childGroupLayouts.forEach((childLayout) => {
                        // For habit nodes, position them relative to the parent
                        if (childLayout.nodeType === 'habit') {
                            childLayout.x += childGroupStartX;
                        } else {
                            childLayout.x += childGroupStartX;
                        }
                        currentLevelLayouts.set(childLayout.id, childLayout);
                    });

                    currentX = blockStartX + requiredWidth + NODE_HORIZONTAL_SPACING;
                }
            );

            return {
                layouts: currentLevelLayouts,
                totalWidth: groupRequiredWidth,
                maxY: cumulativeMaxY,
            };
        },
        [habits] // Add habits as dependency
    );

    // --- Effect to Recalculate Layout (MODIFIED: Preserves Zoom/Pan) ---
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
        const { layouts, totalWidth, maxY } = calculateLayout(
            goals,
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

        // --- State Reset ---
        // DO NOT reset scale, translateX, translateY here to preserve view position
        /*
        // scale.value = withTiming(1); // REMOVED
        // translateX.value = withTiming(0); // REMOVED
        // translateY.value = withTiming(0); // REMOVED
        // savedScale.value = 1; // REMOVED
        // savedTranslateX.value = 0; // REMOVED
        // savedTranslateY.value = 0; // REMOVED
        */

        // Reset interaction state only
        setFocusedNodeId(null);
        setEditingNodeId(null);
    }, [goals, calculateLayout]); // Update dependencies

    // --- handleNodeLayoutMeasured ---
    // Remains unchanged
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

    // --- renderLines ---
    // Modified renderLines to handle habit nodes
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

                    // Use different styling for habit lines
                    const isHabitLine = childLayout.nodeType === 'habit';
                    const lineColor = isHabitLine ? Colors.primary : "#888";
                    const lineStroke = isHabitLine ? "1" : "1.5";
                    const lineDash = isHabitLine ? "4,2" : undefined;

                    const verticalDifference = Math.abs(y2 - y1);
                    const curveFactor = 0.4;
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
    // These remain unchanged from the previous version with the floating panel
    const handleNodeFocus = useCallback((id: string) => {
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

    const handleAddSubgoalToFocused = useCallback(() => {
        if (focusedNodeId) {
            const focusedGoalData = nodeLayouts.get(focusedNodeId)?.goalData;
            if (!focusedGoalData) return;

            // Check if the goal has subgoals
            if (focusedGoalData.subgoals && focusedGoalData.subgoals.length > 0) {
                // Goal already has subgoals - directly add another subgoal
                onAddGoal(focusedNodeId);
            }
            // Check if the goal has habits
            else if (focusedGoalData.habitsIds && focusedGoalData.habitsIds.length > 0) {
                // Goal already has habits - show habit selection modal
                setShowHabitModal(true);
            }
            // Goal has neither subgoals nor habits
            else {
                // Ask user what they want to do
                Alert.alert(
                    "Add to Goal",
                    "What would you like to add to this goal?",
                    [
                        {
                            text: "Subgoal",
                            onPress: () => onAddGoal(focusedNodeId),
                        },
                        {
                            text: "Habits",
                            onPress: () => setShowHabitModal(true),
                        },
                        {
                            text: "Cancel",
                            style: "cancel"
                        },
                    ]
                );
            }
        }
    }, [focusedNodeId, onAddGoal, nodeLayouts]);

    const handleRemoveFocusedGoal = useCallback(() => {
        if (focusedNodeId) {
            const nodeToRemove = nodeLayouts.get(focusedNodeId)?.goalData;
            if (!nodeToRemove) return;

            Alert.alert(
                "Confirm Deletion",
                `Are you sure you want to remove "${nodeToRemove.title}"? This cannot be undone.`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Remove",
                        style: "destructive",
                        onPress: () => {
                            onRemoveGoal(focusedNodeId);
                            // State reset (focus/edit) now happens via useEffect when goals prop changes
                        },
                    },
                ]
            );
        }
    }, [focusedNodeId, onRemoveGoal, nodeLayouts]);

    const handleHabitModalClose = useCallback(() => {
        setShowHabitModal(false);
    }, []);

    // Handler for habit node click
    const handleHabitPress = useCallback((habitId: string) => {
        const habit = habits.find(h => h.id === habitId);
        if (habit) {
            setSelectedHabit(habit);
        }
    }, [habits]);

    // Handler to close the habit edit modal
    const handleCloseHabitEdit = useCallback(() => {
        setSelectedHabit(null);
    }, []);

    // Add handler for toggling goal enabled state
    const handleToggleGoalEnabled = useCallback(() => {
        if (focusedNodeId && focusedGoalData) {
            // Toggle to opposite of current state
            const newEnabledState = !(focusedGoalData.enabled ?? true);
            
            // Dispatch action to update the goal and its children
            dispatch({
                type: 'TOGGLE_GOAL_ENABLED',
                payload: {
                    goalId: focusedNodeId,
                    enabled: newEnabledState
                }
            });
        }
    }, [focusedNodeId, focusedGoalData, dispatch]);

    // --- Render Nodes ---
    // Modified renderNodes to handle both goal and habit nodes
    const renderNodes = useMemo(() => {
        const nodes: React.ReactNode[] = [];
        nodeLayouts.forEach((layout) => {
            if (layout.nodeType === 'goal') {
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
            } else if (layout.nodeType === 'habit' && layout.habitData) {
                nodes.push(
                    <HabitNodeMindMap
                        key={layout.id}
                        id={layout.id}
                        x={layout.x}
                        y={layout.y}
                        width={layout.width}
                        height={layout.height}
                        habit={layout.habitData}
                        onPress={handleHabitPress}
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
        handleHabitPress,
    ]);

    // --- Define Gestures ---
    // Remain unchanged (Pinch, Pan, Tap combined)
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
    // Remains unchanged
    const animatedCanvasStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    // --- Determine Action Panel Button States ---
    // Remains unchanged
    const focusedGoalData = focusedNodeId
        ? nodeLayouts.get(focusedNodeId)?.goalData
        : null;
    const canAddSubgoal =
        !!focusedGoalData &&
        (!focusedGoalData.habitsIds || focusedGoalData.habitsIds.length === 0);
    const isCurrentlyEditing = editingNodeId === focusedNodeId;
    const isPaused = focusedGoalData && focusedGoalData.enabled === false;

    // --- Component Return JSX ---
    return (
        <View style={styles.container}>
            <GestureDetector gesture={composedGesture}>
                <View style={styles.gestureArea}>
                    <Animated.View style={animatedCanvasStyle}>
                        <View
                            style={[
                                styles.canvas,
                                { width: canvasSize.width, height: canvasSize.height },
                            ]}
                        >
                            <Svg
                                width="100%"
                                height="100%"
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
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
                        onPress={handleAddSubgoalToFocused}
                        disabled={!canAddSubgoal}
                        activeOpacity={canAddSubgoal ? 0.7 : 1.0}
                    >
                        <Ionicons
                            name="add"
                            size={22}
                            color={canAddSubgoal ? Colors.grey : Colors.darkGrey}
                        />
                        <Text
                            style={[styles.actionText, !canAddSubgoal && styles.disabledText]}
                        >
                            Add
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
                            {isCurrentlyEditing ? "Done" : "Edit"}
                        </Text>
                    </TouchableOpacity>

                    {/* Add new pause/resume button */}
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
                            {isPaused ? "Resume" : "Pause"}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleRemoveFocusedGoal}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="trash-outline" size={20} color={Colors.red} />
                        <Text style={[styles.actionText, styles.deleteText]}>Remove</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Render the habit modal as a direct child of the container */}
            {showHabitModal && focusedNodeId && nodeLayouts.get(focusedNodeId) && (
                <SelectHabitModal
                    goal={nodeLayouts.get(focusedNodeId)!.goalData}
                    visible={true}
                    onClose={handleHabitModalClose}
                />
            )}

            {/* Habit edit modal */}
            {selectedHabit && (
                <HabitEditModal
                    habit={selectedHabit}
                    // timeModules={timeModules}
                    // fixedColors={['#ff5757', '#ffbd59', '#4cd964', '#5ac8fa', '#5856d6', '#ff2d55']}
                    currentDate={new Date()}
                    onClose={handleCloseHabitEdit}
                />
            )}
        </View>
    );
};

// Add styles for habit nodes
const styles = StyleSheet.create({
    // ... existing styles ...
    habitNode: {
        position: 'absolute',
        height: HABIT_NODE_HEIGHT,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 6,
        borderWidth: 1,
        borderColor: Colors.accent,
        // shadowColor: Colors.background,
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.2,
        // shadowRadius: 1,
        elevation: 2,
    },
    habitNodeText: {
        color: Colors.blue,
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
    container: {
        flex: 1,
        position: "relative",
    },
    gestureArea: {
        flex: 1,
        overflow: "hidden",
        backgroundColor: Colors.background,
    },
    canvas: {
        position: "relative",
        backgroundColor: "transparent",
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
