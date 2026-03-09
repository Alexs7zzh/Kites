import {
  assertNoUserErrors,
  fetchShopifyAdmin,
  SHOPIFY_METAOBJECT_ACCESS,
  writeReport,
} from './lib/shared.mjs'

const GET_DEFINITION_QUERY = `
  query GetDefinition($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      id
      name
      type
      fieldDefinitions {
        key
        name
        required
        type {
          name
        }
        validations {
          name
          value
        }
      }
    }
  }
`

const CREATE_DEFINITION_MUTATION = `
  mutation CreateDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        id
        name
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`

const UPDATE_DEFINITION_MUTATION = `
  mutation UpdateDefinition($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
    metaobjectDefinitionUpdate(id: $id, definition: $definition) {
      metaobjectDefinition {
        id
        name
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`

const BASE_DEFINITIONS = [
  {
    name: 'Content block',
    type: 'content_block',
    fieldDefinitions: [
      {name: 'Block type', key: 'block_type', type: 'single_line_text_field', required: true},
      {name: 'Body', key: 'body', type: 'rich_text_field', required: false},
      {
        name: 'Level',
        key: 'level',
        type: 'number_integer',
        required: false,
        validations: [
          {name: 'min', value: '1'},
          {name: 'max', value: '6'},
        ],
      },
      {
        name: 'Images',
        key: 'images',
        type: 'list.file_reference',
        required: false,
      },
      {
        name: 'Layout',
        key: 'layout',
        type: 'single_line_text_field',
        required: false,
      },
      {name: 'Caption title', key: 'caption_title', type: 'single_line_text_field', required: false},
      {name: 'Caption body', key: 'caption_body', type: 'multi_line_text_field', required: false},
    ],
  },
]

function createPageSectionDefinition(contentBlockDefinitionId) {
  return {
    name: 'Page section',
    type: 'page_section',
    fieldDefinitions: [
      {name: 'Nav label', key: 'nav_label', type: 'single_line_text_field', required: true},
      {name: 'Admin title', key: 'admin_title', type: 'single_line_text_field', required: false},
      {
        name: 'Blocks',
        key: 'blocks',
        type: 'list.metaobject_reference',
        required: true,
        validations: [{name: 'metaobject_definition_id', value: contentBlockDefinitionId}],
      },
    ],
  }
}

function createHomepageDefinition(pageSectionDefinitionId) {
  return {
    name: 'Homepage content',
    type: 'homepage_content',
    fieldDefinitions: [
      {
        name: 'Sections',
        key: 'sections',
        type: 'list.metaobject_reference',
        required: true,
        validations: [{name: 'metaobject_definition_id', value: pageSectionDefinitionId}],
      },
      {name: 'Contact body', key: 'contact_body', type: 'rich_text_field', required: false},
      {name: 'Contact image', key: 'contact_image', type: 'file_reference', required: false},
      {
        name: 'Contact form heading',
        key: 'contact_form_heading',
        type: 'single_line_text_field',
        required: true,
      },
    ],
  }
}

function normalizeValidations(fieldDefinition) {
  return (fieldDefinition.validations ?? [])
    .map((validation) => `${validation.name}:${validation.value}`)
    .sort()
}

function buildFieldOperations(existingFields, targetFields) {
  return targetFields.map((targetField) => {
    const existingField = existingFields.find((field) => field.key === targetField.key)
    if (!existingField) {
      return {create: targetField}
    }

    const existingValidations = normalizeValidations(existingField)
    const targetValidations = normalizeValidations(targetField)
    const existingType = existingField.type?.name ?? null

    if (
      existingField.name === targetField.name &&
      Boolean(existingField.required) === Boolean(targetField.required) &&
      existingType === targetField.type &&
      jsonFieldValue(existingValidations) === jsonFieldValue(targetValidations)
    ) {
      return null
    }

    return {
      update: {
        key: targetField.key,
        name: targetField.name,
        type: targetField.type,
        required: Boolean(targetField.required),
        validations: targetField.validations ?? [],
      },
    }
  }).filter(Boolean)
}

async function upsertDefinition(definition, report) {
  const existingPayload = await fetchShopifyAdmin(GET_DEFINITION_QUERY, {type: definition.type})
  const existingDefinition = existingPayload.metaobjectDefinitionByType

  if (!existingDefinition) {
    const createdPayload = await fetchShopifyAdmin(CREATE_DEFINITION_MUTATION, {
      definition: {
        name: definition.name,
        type: definition.type,
        access: SHOPIFY_METAOBJECT_ACCESS,
        capabilities: {publishable: {enabled: true}},
        fieldDefinitions: definition.fieldDefinitions,
      },
    })

    assertNoUserErrors('metaobjectDefinitionCreate', createdPayload.metaobjectDefinitionCreate)
    const createdDefinition = createdPayload.metaobjectDefinitionCreate.metaobjectDefinition
    report.created.push(definition.type)
    return createdDefinition
  }

  const operations = buildFieldOperations(existingDefinition.fieldDefinitions ?? [], definition.fieldDefinitions)
  if (operations.length === 0) {
    report.unchanged.push(definition.type)
    return existingDefinition
  }

  const updatedPayload = await fetchShopifyAdmin(UPDATE_DEFINITION_MUTATION, {
    id: existingDefinition.id,
    definition: {
      name: definition.name,
      fieldDefinitions: operations,
    },
  })

  assertNoUserErrors('metaobjectDefinitionUpdate', updatedPayload.metaobjectDefinitionUpdate)
  report.updated.push(definition.type)
  return updatedPayload.metaobjectDefinitionUpdate.metaobjectDefinition
}

async function main() {
  const report = {
    created: [],
    updated: [],
    unchanged: [],
  }

  const createdDefinitions = []
  for (const definition of BASE_DEFINITIONS) {
    createdDefinitions.push(await upsertDefinition(definition, report))
  }

  const contentBlockDefinition = createdDefinitions.find((definition) => definition.type === 'content_block')
  if (!contentBlockDefinition) {
    throw new Error('Unable to resolve the content_block definition ID.')
  }

  createdDefinitions.push(await upsertDefinition(createPageSectionDefinition(contentBlockDefinition.id), report))

  const pageSectionDefinition = createdDefinitions.find((definition) => definition.type === 'page_section')
  if (!pageSectionDefinition) {
    throw new Error('Unable to resolve the page_section definition ID.')
  }

  await upsertDefinition(createHomepageDefinition(pageSectionDefinition.id), report)
  const reportPath = await writeReport('metaobject-definitions-report.json', report)
  console.log(`Metaobject definition sync complete. Report: ${reportPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
