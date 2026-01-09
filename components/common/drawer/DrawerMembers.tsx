import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { ChevronDown, ChevronUp, Users } from "lucide-react-native";
import { useDispatch, useSelector } from 'react-redux';
import { fetchMembers } from '../../../store/slices/memberSlice';
import { RootState, AppDispatch } from '../../../store';

export default function DrawerMembers() {
  const dispatch = useDispatch<AppDispatch>();
  const { members, isLoading } = useSelector((state: RootState) => state.members);
  
  const [open, setOpen] = useState(false);

  // Fetch members when component mounts or drawer opens
  useEffect(() => {
    if (open && members.length === 0) {
      console.log('🔄 DrawerMembers: Fetching members...');
      dispatch(fetchMembers());
    }
  }, [open, dispatch]);

  return (
    <View>
      {/* MEMBERS HEADER */}
      <Pressable
        style={styles.header}
        onPress={() => setOpen(prev => !prev)}
      >
        <View style={styles.headerLeft}>
          <Users size={16} color="#CBD5E1" />
          <Text style={styles.headerText}>Members</Text>
          {members.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{members.length}</Text>
            </View>
          )}
        </View>

        {open ? (
          <ChevronUp size={16} color="#94A3B8" />
        ) : (
          <ChevronDown size={16} color="#94A3B8" />
        )}
      </Pressable>

      {/* MEMBERS LIST (DROPDOWN) */}
      {open && (
        <>
          {isLoading && members.length === 0 ? (
            // Loading state
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={styles.loadingText}>Loading members...</Text>
            </View>
          ) : members.length === 0 ? (
            // Empty state
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No family members yet</Text>
            </View>
          ) : (
            // Members list
            members.map(member => (
              <View key={member.id} style={styles.memberRow}>
                <Text style={styles.memberName}>
                  {member.name}, {member.age}/{member.gender.charAt(0)}
                </Text>

                {member.userType === 'SuperUser' && (
                  <Text style={styles.activeBadge}>Super User</Text>
                )}
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
  },
  countBadge: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  memberRow: {
    paddingHorizontal: 36,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0F172A",
  },
  memberName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  activeBadge: {
    marginTop: 4,
    fontSize: 11,
    color: "#A78BFA",
    fontWeight: "600",
  },

  loadingContainer: {
    paddingHorizontal: 36,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 13,
  },

  emptyContainer: {
    paddingHorizontal: 36,
    paddingVertical: 16,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    fontStyle: 'italic',
  },
});