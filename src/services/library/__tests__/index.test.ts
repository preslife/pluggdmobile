import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchLibraryItems } from "../index";

interface TableResponse {
  data: any;
  error: any;
}

const tableResponses: Record<string, TableResponse> = {};

const buildResponse = (table: string): TableResponse => {
  return tableResponses[table] ?? { data: [], error: null };
};

const mockFrom = vi.fn((table: string) => {
  const response = buildResponse(table);
  const promise = Promise.resolve(response);

  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    in: vi.fn(() => builder),
    maybeSingle: vi.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };

  return builder;
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

describe("fetchLibraryItems", () => {
  beforeEach(() => {
    mockFrom.mockClear();
    for (const key of Object.keys(tableResponses)) {
      delete tableResponses[key];
    }
  });

  it("maps Supabase records into library items across all types", async () => {
    tableResponses.download_events = {
      data: [
        { purchase_id: "rel-purchase", purchase_type: "release", created_at: "2024-07-12T00:00:00Z" },
        { purchase_id: "beat-purchase", purchase_type: "beat", created_at: "2024-07-11T00:00:00Z" },
        { purchase_id: "pack-purchase", purchase_type: "sample_pack", created_at: "2024-07-10T00:00:00Z" },
        { purchase_id: "enrollment-1", purchase_type: "course", created_at: "2024-07-09T00:00:00Z" },
      ],
      error: null,
    };

    tableResponses.release_purchases = {
      data: [
        {
          id: "rel-purchase",
          amount_paid: 1299,
          purchased_at: "2024-07-10T00:00:00Z",
          paid_at: "2024-07-10T00:05:00Z",
          download_expires_at: null,
          downloads_used: 1,
          receipt_pdf_url: "https://example.com/receipt-release",
          status: "completed",
          release_id: "release-1",
          releases: {
            id: "release-1",
            title: "Skyline",
            artist: "Nova",
            cover_art_url: "https://example.com/release.jpg",
            genre: "Electronic",
            preview_url: "https://example.com/release-preview.mp3",
            download_limit: 4,
            download_expires_days: 14,
            user_id: "creator-1",
          },
        },
        {
          id: "rel-purchase-pending",
          amount_paid: 999,
          purchased_at: "2024-07-11T00:00:00Z",
          paid_at: null,
          download_expires_at: null,
          downloads_used: 0,
          receipt_pdf_url: null,
          status: "pending",
          release_id: "release-2",
          releases: {
            id: "release-2",
            title: "Skyline Demo",
            artist: "Nova",
            cover_art_url: null,
            genre: null,
            preview_url: null,
            download_limit: 3,
            download_expires_days: null,
            user_id: "creator-1",
          },
        },
      ],
      error: null,
    };

    tableResponses.purchases = {
      data: [
        {
          id: "beat-purchase",
          amount: 2999,
          created_at: "2024-07-09T00:00:00Z",
          beat_id: "beat-1",
          license_pdf_url: "https://example.com/license.pdf",
          beats: {
            id: "beat-1",
            title: "Night Drive",
            producer_name: "Echo",
            image_url: "https://example.com/beat.jpg",
            genre: "Trap",
            audio_url: "https://example.com/beat.mp3",
            price: 2999,
            user_id: "producer-1",
          },
        },
      ],
      error: null,
    };

    tableResponses.sample_pack_purchases = {
      data: [
        {
          id: "pack-purchase",
          amount_paid: 1999,
          purchased_at: "2024-07-08T00:00:00Z",
          download_expires_at: "2024-07-20T00:00:00Z",
          download_url: "https://example.com/pack.zip",
          sample_pack_id: "pack-1",
          sample_packs: {
            id: "pack-1",
            title: "Analog Dreams",
            cover_art_url: "https://example.com/pack.jpg",
            genre: "Synthwave",
            demo_url: "https://example.com/pack-demo.mp3",
            download_url: "https://example.com/pack-alt.zip",
            user_id: "creator-2",
          },
        },
      ],
      error: null,
    };

    tableResponses.memberships = {
      data: [
        {
          id: "membership-1",
          tier_id: "tier-1",
          started_at: "2024-07-07T00:00:00Z",
          created_at: "2024-07-07T00:00:00Z",
          current_period_end: "2024-08-07T00:00:00Z",
          support_amount: 1500,
          metadata: {},
          receipt_url: "https://example.com/membership-receipt",
          membership_tiers: {
            id: "tier-1",
            name: "Gold Circle",
            image_url: "https://example.com/tier.jpg",
            price_monthly: 1500,
            price_yearly: null,
            price_lifetime: null,
            currency: "usd",
            owner_id: "creator-3",
            owner_type: "profile",
            slug: "gold-circle",
          },
        },
      ],
      error: null,
    };

    tableResponses.gated_posts = {
      data: [
        {
          id: "post-1",
          tier_id: "tier-1",
          title: "Member Sample Pack",
          download_url: "https://example.com/member-pack.zip",
          asset_url: null,
          content_url: null,
        },
      ],
      error: null,
    };

    tableResponses.enrollments = {
      data: [
        {
          id: "enrollment-1",
          course_id: "course-1",
          created_at: "2024-07-06T00:00:00Z",
          amount_paid: 5000,
          receipt_url: "https://example.com/course-receipt",
          lessons: [
            {
              id: "lesson-1",
              course_id: "course-1",
              title: "Introduction",
              download_url: "https://example.com/lesson-download.pdf",
              resource_url: null,
            },
          ],
          courses: {
            id: "course-1",
            title: "Mixing Essentials",
            thumbnail_url: "https://example.com/course.jpg",
            price: 5000,
            instructor_id: "instructor-1",
            tags: ["mixing"],
            description: "Learn how to mix like a pro",
          },
        },
      ],
      error: null,
    };

    tableResponses.campaign_supporters = {
      data: [
        {
          id: "support-1",
          campaign_id: "campaign-1",
          user_id: "user-123",
          amount: 2500,
          currency: "usd",
          created_at: "2024-07-05T00:00:00Z",
          receipt_url: "https://example.com/campaign-receipt",
          campaigns: {
            id: "campaign-1",
            title: "Studio Renovation",
            slug: "studio-renovation",
            cover_url: "https://example.com/campaign.jpg",
            owner_id: "creator-4",
            goal: 10000,
            raised: 2500,
            ends_at: "2024-09-01T00:00:00Z",
          },
        },
      ],
      error: null,
    };

    const result = await fetchLibraryItems("user-123", {
      types: ["release", "beat", "sample_pack", "membership", "course", "campaign"],
    });

    expect(result.byType.release).toHaveLength(1);
    expect(result.byType.beat).toHaveLength(1);
    expect(result.byType.sample_pack).toHaveLength(1);
    expect(result.byType.membership).toHaveLength(1);
    expect(result.byType.course).toHaveLength(1);
    expect(result.byType.campaign).toHaveLength(1);

    const releaseItem = result.byType.release[0];
    expect(releaseItem.title).toBe("Skyline");
    expect(releaseItem.downloadCount).toBe(1);
    expect(releaseItem.lastDownloadedAt).toBe("2024-07-12T00:00:00.000Z");
    expect(releaseItem.downloadExpiresAt).toBe("2024-07-24T00:00:00.000Z");
    expect(releaseItem.purchaseDate).toBe("2024-07-10T00:05:00Z");
    expect(releaseItem.downloadSourcePath).toBeNull();

    const membershipItem = result.byType.membership[0];
    expect(membershipItem.canDownload).toBe(true);
    expect(membershipItem.downloadSourcePath).toBe("https://example.com/member-pack.zip");

    const courseItem = result.byType.course[0];
    expect(courseItem.canDownload).toBe(true);
    expect(courseItem.downloadSourcePath).toBe("https://example.com/lesson-download.pdf");

    const campaignItem = result.byType.campaign[0];
    expect(campaignItem.canDownload).toBe(false);
    expect(campaignItem.pricePaid).toBe(2500);

    expect(result.items[0].id).toBe("rel-purchase");
    expect(result.items[result.items.length - 1].id).toBe("support-1");
    expect(result.items.some((item) => item.id === "rel-purchase-pending")).toBe(false);
  });
});
