function setAttrValue(attributeCode, attributeValue) {
  var attribute = EdocsApi.getAttributeValue(attributeCode);
  attribute.value = attributeValue;
  EdocsApi.setAttributeValue(attribute);
}

function onSearchDepartment(request) {
  request.filterCollection.push({
    attributeCode: "Quantity",
    value: "1",
  });
}

function onSearchNamePosition(request) {
  var Department = EdocsApi.getAttributeValue("Department").value;
  if (Department) {
    request.filterCollection.push({
      attributeCode: "Title",
      value: Department,
    });
  }
}

function onChangeSignatory() {
  var employeeId = EdocsApi.getAttributeValue("Signatory")?.value;
  if (employeeId) {
    var data = EdocsApi.getEmployeeDataByEmployeeID(employeeId);
    if (data) {
      setAttrValue(
        "SignatoryNameI",
        data.nameSurname.trim().split(" ")[0] || ""
      );
      setAttrValue(
        "SignatoryNameF",
        data.nameSurname.trim().split(" ")[length - 1] || ""
      );
      setAttrValue("SignatoryPosition", data.positionName || "");
      setAttrValue("SignatoryEmail", data.email || "");
      setAttrValue("CommissionMember3", "1");
    }
  } else {
    setAttrValue("SignatoryNameI", "");
    setAttrValue("SignatoryNameF", "");
    setAttrValue("SignatoryPosition", "");
    setAttrValue("SignatoryEmail", "");
    setAttrValue("CommissionMember3", "");
  }
}

//-------------------------------
// еСайн
//-------------------------------
function setDataForESIGN() {
  debugger;
  var regDate = EdocsApi.getAttributeValue("RegDate").value;
  var regNumber = EdocsApi.getAttributeValue("RegNumber").value;
  var name =
    "№" +
    (regNumber ? regNumber : CurrentDocument.id) +
    (!regDate ? "" : " від " + moment(regDate).format("DD.MM.YYYY"));
  doc = {
    docName: name,
    extSysDocId: CurrentDocument.id,
    ExtSysDocVersion: CurrentDocument.version,
    docType: "commissionDecision",
    parties: [
      {
        taskType: "ToSign",
        taskState: "Done",
        legalEntityCode: EdocsApi.getAttributeValue("OrgEDRPOU").value,
        contactPersonEmail: EdocsApi.getEmployeeDataByEmployeeID(
          CurrentDocument.initiatorId
        ).email,
        signatures: [],
      },
      {
        taskType: "ToSign",
        taskState: "NotAssigned",
        legalEntityCode: EdocsApi.getAttributeValue("SignatoryEmail").value,
        contactPersonEmail: EdocsApi.getAttributeValue("SignatoryEmail").value,
        expectedSignatures: [],
      },
    ],
    sendingSettings: {
      attachFiles: "fixed",
      attachSignatures: "signatureAndStamp",
    },
  };
  EdocsApi.setAttributeValue({ code: "LSDJSON", value: JSON.stringify(doc) });
}

function onTaskExecuteSendOutDoc(routeStage) {
  debugger;
  if (
    routeStage.executionResult != "rejected" &&
    EdocsApi.getAttributeValue("SignatoryEmail")?.value
  ) {
    setDataForESIGN();

    var methodData = {
      extSysDocId: CurrentDocument.id,
      ExtSysDocVersion: CurrentDocument.version,
    };
    routeStage.externalAPIExecutingParams = {
      externalSystemCode: "ESIGN",
      externalSystemMethod: "integration/importDoc",
      data: methodData,
      executeAsync: true,
    };
  }
}

function onTaskCommentedSendOutDoc(caseTaskComment) {
  //debugger;
  var orgCode = EdocsApi.getAttributeValue("OrgEDRPOU").value;
  var orgShortName = EdocsApi.getAttributeValue("OrgName").value;
  if (!orgCode || !orgShortName) {
    return;
  }
  var isCaceling =
    caseTaskComment.comment &&
    caseTaskComment.comment.toLowerCase().startsWith("#cancel#");
  if (isCaceling) {
    caseTaskComment.comment = caseTaskComment.comment.slice(8);
  }
  var methodData = {
    extSysDocId: CurrentDocument.id,
    // extSysDocVersion: CurrentDocument.version,
    eventType: isCaceling ? "CancelProcessing" : "CommentAdded",
    comment: caseTaskComment.comment,
    partyCode: orgCode,
    userTitle: CurrentUser.name,
    partyName: orgShortName,
    occuredAt: new Date(),
  };
  caseTaskComment.externalAPIExecutingParams = {
    externalSystemCode: "ESIGN",
    externalSystemMethod: "integration/processEvent",
    data: methodData,
    executeAsync: true,
  };
}
