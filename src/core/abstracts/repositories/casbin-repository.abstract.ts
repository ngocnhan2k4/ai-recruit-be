import { PtypeEnum } from "@/common/constants";

export interface RemovePolicyParams {
  ptype: PtypeEnum;
  subject: string;
  object: string;
  action: string;
  effect?: string;
}

export interface RemovePolicy2Params {
  ptype: PtypeEnum;
  subject: string;
  domainType: string;
  object: string;
  action: string;
  effect?: string;
}

export abstract class ICasbinRepository {
  /**
   * Remove basic policy (ptype "p") from database
   * Handles malformed policies where effect might be in v1 instead of v3
   */
  abstract removePolicy(params: RemovePolicyParams): Promise<number>;

  /**
   * Remove domain-based policy (ptype "p2") from database
   * Handles malformed policies where effect might be in wrong position
   */
  abstract removePolicy2(params: RemovePolicy2Params): Promise<number>;
}
