import { useLocalSearchParams } from "expo-router";
import { EditMemberScreen } from "../../../src/features/members/EditMemberScreen";

export default function EditMemberRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditMemberScreen memberId={id} />;
}
