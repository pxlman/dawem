import { useAppState } from "@/context/AppStateContext";
import { Goal, Habit } from "@/types/index";

export class GoalHabit {    
    habitId: string;
    goalId: string;
    constructor(habitId: string, goalId: string) {
        this.habitId = habitId;
        this.goalId = goalId;
    }
}

export function habitById(id: string):Habit{
    const {habits} = useAppState();
    return habits.find((habit:Habit) => habit.id === id);
}

export function goalById(id: string):Goal|undefined{
    const {goals} = useAppState();
    return goals.find((goal:Goal) => goal.id === id);
}

export function habitsOfGoal(id:string):Habit[]{
    const {goals, habits} = useAppState();
    const goal = goalById(id);
    if(!goal || !goal.habitsIds) return [];
    
    return goal.habitsIds.map(habitId => 
        habits.find((habit:Habit) => habit.id === habitId)
    ).filter(Boolean) as Habit[];
}