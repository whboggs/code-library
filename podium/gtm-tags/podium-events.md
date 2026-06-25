# Podium Events
Note: no listener snippet is required for this. Podium pushes events to the data layer by default.
## Variables
### DLV - Podium - eventAction
Reads the event from Podium in the Data Layer.
- Variable Type = Data Layer
- Data Layer Variable Name = eventAction

## Triggers
### Podium - Bubble Clicked
Reads the Bubble Clicked Event from Podium.
- Variable Type = `Custom Event`
- Event name = `Webchat Widget`
- This trigger fires on `Some Custom Events`
- Fire this trigger when an Event occurs and all of these conditions are true: `{{DLV - Podium - eventAction}}` `contains` `Bubble Clicked`

### Podium - Conversation Started
Reads the Conversation Started Event from Podium.
- Variable Type = `Custom Event`
- Event name = `Webchat Widget`
- This trigger fires on `Some Custom Events`
- Fire this trigger when an Event occurs and all of these conditions are true: `{{DLV - Podium - eventAction}}` `contains` `Conversation Started`

## Tags
Set up any desired tags using the Triggers above.
