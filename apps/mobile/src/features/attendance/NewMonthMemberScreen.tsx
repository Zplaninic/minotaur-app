import type { Month } from "@repo/shared";
import { useRouter } from "expo-router";
import { MemberFormScreen } from "../members/MemberFormScreen";

type NewMonthMemberScreenProps = {
  groupId: string;
  month: Month;
};

// Creates a member, then returns to the month's picker with them on top.
export const NewMonthMemberScreen = ({ groupId, month }: NewMonthMemberScreenProps) => {
  const router = useRouter();
  return (
    <MemberFormScreen
      onCreated={(created) =>
        router.dismissTo({
          pathname: "/groups/[id]/add-month-member",
          params: { id: groupId, month, newMemberId: created.id },
        })
      }
    />
  );
};
