import { useLocalSearchParams } from "expo-router";
import { AddGroupMemberScreen } from "../../../src/features/groups/AddGroupMemberScreen";

export default function AddGroupMemberRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AddGroupMemberScreen groupId={id} />;
}
