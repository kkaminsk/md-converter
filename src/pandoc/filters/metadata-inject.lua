-- metadata-inject.lua
-- Normalizes and injects metadata into document properties
-- - Ensures title is present (defaults to "Untitled Document")
-- - Maps classification to subject field
-- - Adds generator field

function Meta(meta)
  -- Ensure title is present
  if not meta.title or pandoc.utils.stringify(meta.title) == "" then
    meta.title = pandoc.MetaString("Untitled Document")
  end

  -- Map classification to subject for document properties
  if meta.classification then
    local classification = pandoc.utils.stringify(meta.classification)
    if classification ~= "" then
      meta.subject = pandoc.MetaString(classification)
    end
  end

  -- Add generator field
  meta.generator = pandoc.MetaString("md-converter")

  -- Ensure section_breaks has a default if not specified
  if not meta.section_breaks then
    meta.section_breaks = pandoc.MetaString("auto")
  end

  -- Ensure slide_breaks has a default if not specified
  if not meta.slide_breaks then
    meta.slide_breaks = pandoc.MetaString("h2")
  end

  return meta
end

return {
  { Meta = Meta }
}
