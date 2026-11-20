import { useLocalSearchParams } from "expo-router";
import { NewMonthMemberScreen } from "../../../src/features/attendance/NewMonthMemberScreen";

export default function NewMonthMemberRoute() {
  const { id, month } = useLocalSearchParams<{ id: string; month: string }>();
  return <NewMonthMemberScreen groupId={id} month={month} />;
}
