import { useLocalSearchParams } from "expo-router";
import { EditSubscriptionScreen } from "../../../src/features/subscriptions/EditSubscriptionScreen";

export default function EditSubscriptionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditSubscriptionScreen subscriptionId={id} />;
}
