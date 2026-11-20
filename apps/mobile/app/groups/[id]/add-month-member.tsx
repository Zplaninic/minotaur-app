import { useLocalSearchParams } from "expo-router";
import { AddMonthMemberScreen } from "../../../src/features/attendance/AddMonthMemberScreen";

export default function AddMonthMemberRoute() {
  const { id, month, newMemberId } = useLocalSearchParams<{ id: string; month: string; newMemberId?: string }>();
  return <AddMonthMemberScreen groupId={id} month={month} newMemberId={newMemberId} />;
}
