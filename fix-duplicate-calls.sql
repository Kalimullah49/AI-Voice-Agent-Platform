-- Fix duplicate calls in database
-- Keep the call with the most complete data (highest duration, cost, and recording URL)

-- Step 1: Identify and remove duplicates for the specific problematic call
DELETE FROM calls 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY vapi_call_id 
             ORDER BY 
               CASE WHEN recording_url IS NOT NULL THEN 1 ELSE 0 END DESC,
               duration DESC,
               cost DESC,
               started_at DESC
           ) as rn
    FROM calls 
    WHERE vapi_call_id = 'a2e94835-bf30-4dd7-97aa-3debf8174707'
  ) t
  WHERE t.rn > 1
);

-- Step 2: Update the remaining call with the best data
UPDATE calls 
SET 
  duration = GREATEST(duration, 34),
  cost = GREATEST(cost, 0.0454),
  outcome = 'completed',
  ended_reason = 'customer-ended-call'
WHERE vapi_call_id = 'a2e94835-bf30-4dd7-97aa-3debf8174707';

-- Step 3: Check for any other duplicates and remove them
DELETE FROM calls 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY vapi_call_id 
             ORDER BY 
               CASE WHEN recording_url IS NOT NULL THEN 1 ELSE 0 END DESC,
               duration DESC,
               cost DESC,
               started_at DESC
           ) as rn
    FROM calls 
    WHERE vapi_call_id IS NOT NULL
  ) t
  WHERE t.rn > 1
);