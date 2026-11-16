import { useLocalSearchParams } from "expo-router";
import { MemberSubscriptionScreen } from "../../../src/features/attendance/MemberSubscriptionScreen";

export default function MemberSubscriptionRoute() {
  const { id, month, memberId } = useLocalSearchParams<{ id: string; month: string; memberId: string }>();
  return <MemberSubscriptionScreen groupId={id} month={month} memberId={memberId} />;
}
