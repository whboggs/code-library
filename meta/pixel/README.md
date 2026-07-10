#README

## All Variables Used
| Meta Pixel Property | Value Type | Description | GA4 Equivalent | Custom Variable Name |
|---|---|---|---|---|
| `content_category` | String | Category of the page/product. Optional. | `items[].item_category` | `dlv - content_category` |
| `content_ids` | Array of integers or strings | Product IDs associated with the event, such as SKUs. | `items[].item_id` | `dlv - content_ids` |
| `content_name` | String | Name of the page/product. Optional. | `items[].item_name` | `dlv - content_name` |
| `content_type` | String | Either `product` or `product_group` based on the IDs passed in `content_ids` or `contents`. | — (no GA4 equivalent) | `dlv - content_type` |
| `contents` | Array of objects | Array of JSON objects with product IDs and quantities. `id` and `quantity` required. | `items[]` array | `dlv - contents` |
| `currency` | String | The currency for the `value` specified. | `currency` | `dlv - currency` |
| `num_items` | Integer | Used with `InitiateCheckout`. Number of items when checkout was initiated. | — (sum of `items[].quantity`) | `dlv - num_items` |
| `predicted_ltv` | Integer, float | Predicted lifetime value of a subscriber as defined by the advertiser. | — (GA4 computes pLTV internally) | `dlv - predicted_ltv` |
| `search_string` | String | Used with the `Search` event. The string entered by the user. | `search_term` | `dlv - search_string` |
| `status` | Boolean | Used with `CompleteRegistration` to show registration status. Optional. | — | `dlv - status` |
| `value` | Integer or float | The value of a user performing this event to the business. | `value` | `dlv - value` |
