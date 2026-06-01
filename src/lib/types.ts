export interface Vote {
  id: string;
  truck_number: number;
  voter_name: string;
  mobile_number: string;
  ip_address: string;
  created_at: string;
}

export interface TruckTally {
  truck_number: number;
  vote_count: number;
}
