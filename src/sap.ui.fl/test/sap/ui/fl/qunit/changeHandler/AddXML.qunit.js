/*global QUnit*/

QUnit.config.autostart = false;

sap.ui.require([
	'sap/ui/fl/changeHandler/AddXML',
	'sap/ui/fl/Change',
	'sap/ui/fl/changeHandler/JsControlTreeModifier',
	'sap/ui/fl/changeHandler/XmlTreeModifier',
	'sap/m/HBox',
	'sap/m/Button'
], function(
	AddXML,
	Change,
	JsControlTreeModifier,
	XmlTreeModifier,
	HBox,
	Button
) {
	'use strict';
	QUnit.start();

	var oFragment = '<Button xmlns="sap.m" id="button" text="Hello World"></Button>';
	var oFragmentInvalid = '<ManagedObject xmlns="sap.ui.base"></ManagedObject>';
	var oFragmentMultiple = '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core">' +
								'<Button xmlns="sap.m" id="button" text="Hello World"></Button>' +
								'<Button xmlns="sap.m" id="button2" text="Hello World"></Button>' +
								'<Button xmlns="sap.m" id="button3" text="Hello World"></Button>' +
							'</core:FragmentDefinition>';
	var oFragmentMultipleInvalid = '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core" xmlns:base="sap.ui.base">' +
										'<Button xmlns="sap.m" id="button" text="Hello World"></Button>' +
										'<Button xmlns="sap.m" id="button2" text="Hello World"></Button>' +
										'<base:ManagedObject></base:ManagedObject>' +
									'</core:FragmentDefinition>';

	var sTypeError = "The Control does not match the type of the targetAggregation.";
	var sWrongAggregationError = "The given Aggregation is not available in the given control.";
	var sXmlError = "The XML Fragment could not be instantiated";

	// the completeChangeContent function ignores the fragment property, but in applyChange we still need the information.
	// that's why we need to patch it in there before a change is applied.
	// in the code this is done in the command.
	var fnAddContentToChange = function(oChange, sFragment) {
		sFragment = sFragment || oFragment;
		oChange.getDefinition().content.fragment = sFragment;
	};

	QUnit.module("Given a AddXML Change Handler", {
		beforeEach : function() {
			this.oChangeHandler = AddXML;
			this.oHBox = new HBox("hbox", {
				items: [this.oButton]
			});

			var oChangeJson = {
				selector: {
					id: this.oHBox.getId(),
					type: "sap.m.HBox"
				},
				changeType: "addXML",
				fileName: "addXMLChange"
			};

			this.oChangeSpecificContent = {
				fragment: oFragment,
				fragmentPath: "fragmentPath",
				targetAggregation: "items",
				index: 1
			};

			this.oChange = new Change(oChangeJson);
		},
		afterEach : function() {
			this.oHBox.destroy();
		}
	}, function() {
		QUnit.test("When calling 'completeChangeContent' with complete information", function(assert) {
			var oExpectedChangeContent = {
				fragmentPath: "fragmentPath",
				targetAggregation: "items",
				index: 1
			};

			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			var oSpecificContent = this.oChange.getDefinition().content;
			assert.deepEqual(oSpecificContent, oExpectedChangeContent, "then the change specific content is in the change, but the fragment not");
		});

		QUnit.test("When calling 'completeChangeContent' without complete information", function(assert) {
			this.oChangeSpecificContent.targetAggregation = null;
			assert.throws(
				function() {this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);},
				Error("Attribute missing from the change specific content'targetAggregation'"),
				"without targetAggregation 'completeChangeContent' throws an error"
			);

			this.oChangeSpecificContent.targetAggregation = "items";
			this.oChangeSpecificContent.fragmentPath = null;
			assert.throws(
				function() {this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);},
				Error("Attribute missing from the change specific content'fragmentPath'"),
				"without fragmentPath 'completeChangeContent' throws an error"
			);

			this.oChangeSpecificContent.fragmentPath = "fragmentPath";
			this.oChangeSpecificContent.index = undefined;
			assert.throws(
				function() {this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);},
				Error("Attribute missing from the change specific content'index'"),
				"without index 'completeChangeContent' throws an error"
			);
		});
	});

	QUnit.module("Given a AddXML Change Handler with JSTreeModifier", {
		beforeEach : function() {
			this.oChangeHandler = AddXML;
			this.oButton = new Button();
			this.oHBox = new HBox("hbox", {
				items: [this.oButton]
			});
			this.oHBox.placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();

			var oChangeJson = {
				selector: {
					id: this.oHBox.getId(),
					type: "sap.m.HBox"
				},
				changeType: "addXML",
				fileName: "addXMLChange"
			};

			this.oChangeSpecificContent = {
				fragment: oFragment,
				fragmentPath: "fragmentPath",
				targetAggregation: "items",
				index: 1
			};

			this.oChange = new Change(oChangeJson);
		},
		afterEach : function() {
			this.oHBox.destroy();
		}
	}, function() {
		QUnit.test("When applying the change on a js control tree", function(assert) {
			assert.equal(this.oHBox.getItems().length, 1, "initially there is only 1 item in the hbox");

			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange);
			this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});
			assert.equal(this.oHBox.getItems().length, 2, "after the change there are 2 items in the hbox");
		});

		QUnit.test("When applying the change on a js control tree without setting the fragment", function(assert) {
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});},
				Error(sXmlError),
				"then apply change throws an error"
			);
		});

		QUnit.test("When applying the change on a js control tree with an invalid targetAggregation", function(assert) {
			this.oChangeSpecificContent.targetAggregation = "invalidAggregation";
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});},
				Error(sWrongAggregationError),
				"then apply change throws an error"
			);
		});

		QUnit.test("When applying the change on a js control tree with an invalid fragment", function(assert) {
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, "invalidFragment");
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});},
				Error(sXmlError),
				"then apply change throws an error"
			);
		});

		QUnit.test("When applying the change on a js control tree with an invalid type", function(assert) {
			this.oChangeSpecificContent.fragment = oFragmentInvalid;
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragmentInvalid);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});},
				Error(sTypeError),
				"then apply change throws an error"
			);
		});

		QUnit.test("When applying the change on a js control tree with multiple root elements", function(assert) {
			assert.equal(this.oHBox.getItems().length, 1, "initially there is only 1 item in the hbox");

			this.oChangeSpecificContent.fragment = oFragmentMultiple;
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragmentMultiple);
			this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});

			var oItems = this.oHBox.getItems();
			assert.equal(oItems.length, 4, "after the change there are 4 items in the hbox");
			assert.equal(oItems[1].getId(), "addXMLChange--button", "then the first button in the fragment has the correct index and ID");
			assert.equal(oItems[2].getId(), "addXMLChange--button2", "then the second button in the fragment has the correct index and ID");
			assert.equal(oItems[3].getId(), "addXMLChange--button3", "then the third button in the fragment has the correct index and ID");
		});

		QUnit.test("When applying the change on a js control tree with multiple root elements and one invalid type inside", function(assert) {
			assert.equal(this.oHBox.getItems().length, 1, "initially there is only 1 item in the hbox");

			this.oChangeSpecificContent.fragment = oFragmentMultipleInvalid;
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragmentMultipleInvalid);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});},
				Error(sTypeError),
				"then apply change throws an error"
			);

			assert.equal(this.oHBox.getItems().length, 1, "after the change there is still only 1 item in the hbox");
		});

		QUnit.test("When reverting the change on a js control tree", function(assert) {
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragment);
			this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});
			this.oChangeHandler.revertChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});
			assert.equal(this.oHBox.getItems().length, 1, "after reversal there is again only one child of the HBox");
			assert.equal(this.oChange.getRevertData(), undefined, "and the revert data got reset");
		});

		QUnit.test("When reverting the change on a js control tree with multiple root elements", function(assert) {
			assert.equal(this.oHBox.getItems().length, 1, "before the change there is only one child of the HBox");

			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragmentMultiple);
			this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});
			this.oChangeHandler.revertChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});

			assert.equal(this.oHBox.getItems().length, 1, "after reversal there is again only one child of the HBox");
			assert.equal(this.oChange.getRevertData(), undefined, "and the revert data got reset");
		});

		QUnit.test("When reverting a change that failed on a js control tree with multiple root elements", function(assert) {
			assert.equal(this.oHBox.getItems().length, 1, "before the change there is only one child of the HBox");

			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragmentMultipleInvalid);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});},
				Error(sTypeError),
				"then apply change throws an error"
			);
			this.oChangeHandler.revertChange(this.oChange, this.oHBox, {modifier: JsControlTreeModifier});

			assert.equal(this.oHBox.getItems().length, 1, "after reversal there is again only one child of the HBox");
		});
	});

	QUnit.module("Given a AddXML Change Handler with XMLTreeModifier", {
		beforeEach : function() {
			this.oChangeHandler = AddXML;

			jQuery.sap.registerModulePath("testComponent", "../testComponent");
			this.oComponent = sap.ui.getCore().createComponent({
				name: "testComponent",
				id: "testComponent",
				"metadata": {
					"manifest": "json"
				}
			});
			this.oXmlString =
				'<mvc:View id="testComponent---myView" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">' +
					'<HBox id="hbox">' +
						'<tooltip>' +	//0..1 aggregation
							'<TooltipBase xmlns="sap.ui.core"></TooltipBase>' + //inline namespace as sap.ui.core is use case for not existing namespace
						'</tooltip>' +
						'<items>' +
							'<Button id="button123"></Button>' + //content in default aggregation
						'</items>' +
					'</HBox>' +
				'</mvc:View>';
			this.oXmlView = jQuery.sap.parseXML(this.oXmlString, "application/xml").documentElement;
			this.oHBox = this.oXmlView.childNodes[0];

			var oChangeJson = {
				selector: {
					id: "hbox",
					type: "sap.m.HBox"
				},
				changeType: "addXML",
				fileName: "addXMLChange"
			};

			this.oChangeSpecificContent = {
				fragment: oFragment,
				fragmentPath: "fragmentPath",
				targetAggregation: "items",
				index: 1
			};

			this.oChange = new Change(oChangeJson);
		},
		afterEach : function() {
			this.oComponent.destroy();
		}
	}, function() {
		QUnit.test("When applying the change on a xml control tree", function(assert) {
			var oHBoxItems = this.oHBox.childNodes[1];
			assert.equal(oHBoxItems.childNodes.length, 1, "initially there is only one child of the HBox");
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragment);
			this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});
			assert.equal(oHBoxItems.childNodes.length, 2, "after the addXML there are two children of the HBox");
		});

		QUnit.test("When applying the change on a xml control tree without setting the fragment", function(assert) {
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});},
				Error(sXmlError),
				"then apply change throws an error"
			);
		});

		QUnit.test("When applying the change on a xml control tree with an invalid targetAggregation", function(assert) {
			this.oChangeSpecificContent.targetAggregation = "invalidAggregation";
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});},
				Error(sWrongAggregationError),
				"then apply change throws an error"
			);
		});

		QUnit.test("When applying the change on a xml control tree with an invalid fragment", function(assert) {
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, "invalidFragment");
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});},
				Error(sXmlError),
				"then apply change throws an error"
			);
		});

		QUnit.test("When applying the change on a xml control tree with an invalid type", function(assert) {
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragmentInvalid);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});},
				Error(sTypeError),
				"then apply change throws an error"
			);
		});

		QUnit.test("When reverting the change on an xml control tree", function(assert) {
			var oHBoxItems = this.oHBox.childNodes[1];
			assert.equal(oHBoxItems.childNodes.length, 1, "before the change there is only one child of the HBox");

			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragment);
			this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});
			this.oChangeHandler.revertChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});

			assert.equal(oHBoxItems.childNodes.length, 1, "after reversal there is again only one child of the HBox");
			assert.equal(this.oChange.getRevertData(), undefined, "and the revert data got reset");
		});

		// during processing of multiple root elements fragments in XML, in phantomJS the nodes don't get the correct ID
		// specified in the XML. Therefore we skip this test in phantomJS.
		if (!sap.ui.Device.browser.phantomJS) {
			QUnit.test("When applying the change on a xml control tree with multiple root elements", function(assert) {
				var oHBoxItems = this.oHBox.childNodes[1];
				assert.equal(oHBoxItems.childNodes.length, 1, "initially there is only one child of the HBox");

				this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
				fnAddContentToChange(this.oChange, oFragmentMultiple);
				this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});

				assert.equal(oHBoxItems.childNodes.length, 4, "after the change there are 4 items in the hbox");
				assert.equal(oHBoxItems.childNodes[1].getAttribute("id"), "addXMLChange--button", "then the first button in the fragment has the correct index and ID");
				assert.equal(oHBoxItems.childNodes[2].getAttribute("id"), "addXMLChange--button2", "then the second button in the fragment has the correct index and ID");
				assert.equal(oHBoxItems.childNodes[3].getAttribute("id"), "addXMLChange--button3", "then the third button in the fragment has the correct index and ID");
			});
		}

		QUnit.test("When applying the change on a xml control tree with multiple root elements and one invalid type inside", function(assert) {
			var oHBoxItems = this.oHBox.childNodes[1];
			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragmentMultipleInvalid);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});},
				Error(sTypeError),
				"then apply change throws an error"
			);
			assert.equal(oHBoxItems.childNodes.length, 1, "after the change there is still only 1 item in the hbox");
		});

		QUnit.test("When reverting the change on an xml control tree with multiple root elements", function(assert) {
			var oHBoxItems = this.oHBox.childNodes[1];
			assert.equal(oHBoxItems.childNodes.length, 1, "before the change there is only one child of the HBox");

			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragmentMultiple);
			this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});
			this.oChangeHandler.revertChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});

			assert.equal(oHBoxItems.childNodes.length, 1, "after reversal there is again only one child of the HBox");
			assert.equal(this.oChange.getRevertData(), undefined, "and the revert data got reset");
		});

		QUnit.test("When reverting a failed change on an xml control tree with multiple root elements", function(assert) {
			var oHBoxItems = this.oHBox.childNodes[1];
			assert.equal(oHBoxItems.childNodes.length, 1, "before the change there is only one child of the HBox");

			this.oChangeHandler.completeChangeContent(this.oChange, this.oChangeSpecificContent);
			fnAddContentToChange(this.oChange, oFragmentMultipleInvalid);
			assert.throws(
				function() {this.oChangeHandler.applyChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});},
				Error(sTypeError),
				"then apply change throws an error"
			);
			this.oChangeHandler.revertChange(this.oChange, this.oHBox, {modifier: XmlTreeModifier, view: this.oXmlView, appComponent: this.oComponent});

			assert.equal(oHBoxItems.childNodes.length, 1, "after reversal there is again only one child of the HBox");
		});
	});
});