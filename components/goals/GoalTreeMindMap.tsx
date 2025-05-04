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
    withTiming,
    runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import GoalNodeMindMap, { NODE_WIDTH, NODE_BASE_HEIGHT, NODE_VERTICAL_SPACING, NODE_HORIZONTAL_SPACING, } from "./GoalNodeMindMap";
// Remove unused HabitNodeMindMap import
import { Goal, NodeLayout } from "@/types/index";
import { useAppDispatch, useAppState } from "@/context/AppStateContext";
import Colors from "@/constants/Colors";
import SelectHabitModal from "../SelectHabitModal";

// Simple node layout interface
interface ExtendedNodeLayout extends NodeLayout {
    goalData: Goal;
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
    const { goals } = useAppState();
    const dispatch = useAppDispatch();

    // Update state to use simplified ExtendedNodeLayout
    const [nodeLayouts, setNodeLayouts] = useState<Map<string, ExtendedNodeLayout>>(
        new Map()
    );
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [showHabitModal, setShowHabitModal] = useState(false);

    // --- Reanimated Shared Values ---
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    // --- Layout Calculation ---
    // Remove getGoalType function as it's no longer needed

    // Simplified calculateLayout function without type checking
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
                const hasSubgoals = goal.subgoals && goal.subgoals.length > 0;
                
                // Process goal based on whether it has subgoals or not
                if (hasSubgoals) {
                    // Process subgoals
                    const childrenY = startY + nodeHeight + NODE_VERTICAL_SPACING;
                    const subResult = calculateLayout(
                        goal.subgoals!,
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
                        subResult
                    };
                } 
                else {
                    // Empty goal (no subgoals)
                    return { 
                        goal, 
                        nodeWidth, 
                        nodeHeight, 
                        requiredWidth: nodeWidth, 
                        subResult: { 
                            layouts: new Map<string, ExtendedNodeLayout>(), 
                            totalWidth: 0, 
                            maxY: startY + nodeHeight 
                        }
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
                ({ goal, nodeWidth, nodeHeight, requiredWidth, subResult }) => {
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

                    // Add child layouts
                    const childGroupLayouts = subResult.layouts;
                    const childGroupWidth = subResult.totalWidth;
                    
                    // Center the child nodes beneath the parent
                    const childGroupStartX = layout.x + nodeWidth / 2 - childGroupWidth / 2;
                    
                    childGroupLayouts.forEach((childLayout) => {
                        // Adjust position relative to parent
                        childLayout.x += childGroupStartX;
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
        []
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

    // --- renderLines ---
    // Simplified renderLines with only goal nodes
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

                    const lineColor = "#888";
                    const lineStroke = "1.5";

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
        }
    }, [focusedNodeId, nodeLayouts, dispatch]);

    // Add the missing handler for removing focused goal
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
                            setFocusedNodeId(null);
                            setEditingNodeId(null);
                        },
                    },
                ]
            );
        }
    }, [focusedNodeId, onRemoveGoal, nodeLayouts]);

    // Simplify handleAddSubgoalToFocused without node type checking
    const handleAddSubgoalToFocused = useCallback(() => {
        if (focusedNodeId) {
            const focusedGoalData = nodeLayouts.get(focusedNodeId)?.goalData;
            if (!focusedGoalData) return;
            
            // Simply add a subgoal - no type checking needed
            onAddGoal(focusedNodeId);
        }
    }, [focusedNodeId, onAddGoal, nodeLayouts]);

    const handleHabitModalClose = useCallback(() => {
        setShowHabitModal(false);
    }, []);

    // Simplified renderNodes to only handle goal nodes
    const renderNodes = useMemo(() => {
        const nodes: React.ReactNode[] = [];
        nodeLayouts.forEach((layout) => {
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
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="add"
                            size={22}
                            color={Colors.grey}
                        />
                        <Text style={styles.actionText}>
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
