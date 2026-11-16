import { useLocalSearchParams } from "expo-router";
import { AddMonthMemberScreen } from "../../../src/features/attendance/AddMonthMemberScreen";

export default function AddMonthMemberRoute() {
  const { id, month } = useLocalSearchParams<{ id: string; month: string }>();
  return <AddMonthMemberScreen groupId={id} month={month} />;
}
