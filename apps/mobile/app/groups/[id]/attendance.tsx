import { useLocalSearchParams } from "expo-router";
import { AttendanceScreen } from "../../../src/features/attendance/AttendanceScreen";

export default function AttendanceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AttendanceScreen groupId={id} />;
}
